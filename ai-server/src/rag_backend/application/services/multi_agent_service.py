"""Multi-Agent Service — Entry point for LangGraph RAG."""

from langchain_core.messages import HumanMessage, ToolMessage
from langgraph.graph import StateGraph, END
from langgraph.types import Send

from rag_backend.domain.models.agent_state import DeepAgentState


class MultiAgentService:
    def __init__(self, master_agent, paralegal_factory, max_iterations=5):
        self._master_agent = master_agent
        self._paralegal_factory = paralegal_factory
        self._max_iterations = max_iterations
        self._graph = self._build_graph()

    def _build_graph(self):
        builder = StateGraph(DeepAgentState)  # type: ignore[arg-type]
        
        # Add nodes
        builder.add_node("master", self._master_agent.run)
        builder.add_node("master_tools", self._master_tools_node)
        builder.add_node("paralegal", self._paralegal_factory.run_parallel)
        
        # Set entry point
        builder.set_entry_point("master")
        
        # Add edges
        builder.add_conditional_edges(
            "master", 
            self._route_after_master,
            # We must specify the path map if we are using dynamic routes
            ["master_tools", "paralegal", END]
        )
        
        # After executing simple tools, go back to master to see if it wants to delegate or answer
        builder.add_edge("master_tools", "master")
        
        # After parallel paralegals finish, go back to master
        builder.add_edge("paralegal", "master")
        
        return builder.compile()

    async def _master_tools_node(self, state: DeepAgentState) -> dict:
        """Execute simple tools (write_todos, read_todos, read_research_findings)."""
        last_msg = state["messages"][-1]
        
        tool_messages = []
        new_todos = None
        
        for tc in getattr(last_msg, "tool_calls", []):
            if tc["name"] == "write_todos":
                todos = tc["args"].get("todos", [])
                new_todos = todos
                tool_messages.append(ToolMessage(content="Đã ghi nhận danh sách công việc.", tool_call_id=tc["id"]))
            
            elif tc["name"] == "read_todos":
                tool_messages.append(ToolMessage(content=str(state.get("todos", [])), tool_call_id=tc["id"]))
                
            elif tc["name"] == "read_research_findings":
                tool_messages.append(ToolMessage(content=str(state.get("research_findings", [])), tool_call_id=tc["id"]))
                
        ret = {"messages": tool_messages}
        if new_todos is not None:
            ret["todos"] = new_todos
        return ret

    def _route_after_master(self, state: DeepAgentState):
        """Routing logic after Master node."""
        last_msg = state["messages"][-1]
        
        if state["iteration_count"] >= state["max_iterations"]:
            return END
            
        if not getattr(last_msg, "tool_calls", None):
            # No tool calls -> finished
            return END
            
        sends = []
        has_simple_tools = False
        
        for tc in last_msg.tool_calls:
            if tc["name"] == "delegate_task":
                sends.append(Send("paralegal", {
                    "task_description": tc["args"].get("description", ""),
                    "law_name": tc["args"].get("law_name"),
                    "tool_call_id": tc["id"]
                }))
            else:
                has_simple_tools = True
                
        destinations = sends
        if has_simple_tools:
            destinations.append("master_tools")
            
        if not destinations:
            return END
            
        return destinations

    async def run(self, question: str) -> dict:
        initial_state = {
            "messages": [HumanMessage(content=question)],
            "todos": [],
            "research_findings": [],
            "original_question": question,
            "final_answer": None,
            "iteration_count": 0,
            "max_iterations": self._max_iterations
        }
        
        # Run graph
        result = await self._graph.ainvoke(initial_state)
        
        # extract final answer from last message
        # NOTE: Google Gemini via LangChain may return content as a list of
        # content blocks: [{'type': 'text', 'text': '...'}] instead of plain str.
        raw_content = result["messages"][-1].content
        if isinstance(raw_content, list):
            # Extract and join all text blocks
            final_answer = " ".join(
                block.get("text", "")
                for block in raw_content
                if isinstance(block, dict) and block.get("type") == "text"
            )
        else:
            final_answer = raw_content or ""
        
        return {
            "answer": final_answer,
            "todos_executed": result["todos"],
            "research_findings": result["research_findings"],
            "iterations": result["iteration_count"]
        }
