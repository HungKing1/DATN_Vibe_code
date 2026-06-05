"""Paralegal Agent Node."""

import json
from langchain_core.messages import HumanMessage, ToolMessage
from langgraph.prebuilt import create_react_agent

from rag_backend.domain.models.agent_state import ParalegalInput, ResearchFinding
from rag_backend.application.agents.agent_tools import (
    create_search_law_database_tool,
    think_tool,
)


class ParalegalAgentFactory:
    def __init__(
        self,
        llm_provider,
        vector_repository,
        embedding_provider,
        prompt_manager,
        reranker,
        retrieval_top_k: int = 20,
        hybrid_search_alpha: float = 0.5,
        max_recursion: int = 10,
    ):
        self._llm = llm_provider.get_underlying_model()
        self._prompt_manager = prompt_manager
        self._max_recursion = max_recursion
        self._tools = [
            create_search_law_database_tool(
                vector_repository, embedding_provider, reranker,
                retrieval_top_k=retrieval_top_k,
                hybrid_search_alpha=hybrid_search_alpha,
            ),
            think_tool,
        ]

    async def run_parallel(self, input_data: ParalegalInput) -> dict:
        """Run a parallel instance of Paralegal."""
        system_prompt = self._prompt_manager.get_prompt("paralegal_system")
        
        # Create a mini react agent for this specific task
        agent = create_react_agent(self._llm, self._tools, prompt=system_prompt)
        
        task_msg = f"Task Description: {input_data['task_description']}\n"
        if input_data.get("law_name"):
            task_msg += f"Law name filter: {input_data['law_name']}\n"
        if input_data.get("so_ky_hieu"):
            task_msg += f"Document number filter: {input_data['so_ky_hieu']}\n"
        if input_data.get("dieu_number") is not None:
            task_msg += f"Article number filter: {input_data['dieu_number']}\n"
            
        result = await agent.ainvoke(
            {"messages": [HumanMessage(content=task_msg)]},
            config={"recursion_limit": self._max_recursion},
        )
        
        # Extract research findings from tool calls
        chunks_collected = []
        queries_used = []
        
        for msg in result["messages"]:
            if getattr(msg, "tool_calls", None):
                for tc in msg.tool_calls:
                    if tc["name"] == "search_law_database":
                        queries_used.append(tc["args"].get("query", ""))
            
            if isinstance(msg, ToolMessage) and msg.name == "search_law_database":
                chunks_collected.append({"content": msg.content})
                
        finding = ResearchFinding(
            task_description=input_data["task_description"],
            law_name=input_data.get("law_name"),
            so_ky_hieu=input_data.get("so_ky_hieu"),
            dieu_number=input_data.get("dieu_number"),
            query_used=", ".join(queries_used),
            chunks=chunks_collected,
        )
        
        # Return state update for Master
        return {
            "research_findings": [finding],
            "messages": [
                ToolMessage(
                    content=f"Paralegal finished task: {input_data['task_description']}. Data is in research_findings.",
                    tool_call_id=input_data["tool_call_id"],
                )
            ]
        }
