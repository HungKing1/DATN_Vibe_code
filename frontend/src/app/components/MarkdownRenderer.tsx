import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Tiền xử lý: đảm bảo bảng GFM được nhận dạng đúng.
 * remarkGfm yêu cầu một dòng trống (blank line) trước và sau block bảng.
 * Nếu content từ DB chỉ có 1 newline, bảng sẽ bị bỏ qua → render thành text.
 */
function preprocessMarkdown(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prevLine = i > 0 ? lines[i - 1] : '';
    const isTableRow = line.trimStart().startsWith('|');
    const prevIsTableRow = prevLine.trimStart().startsWith('|');
    const prevIsBlank = prevLine.trim() === '';

    // Chèn blank line TRƯỚC dòng đầu tiên của bảng
    if (isTableRow && !prevIsTableRow && !prevIsBlank) {
      result.push('');
    }

    result.push(line);

    // Chèn blank line SAU dòng cuối cùng của bảng
    const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
    const nextIsTableRow = nextLine.trimStart().startsWith('|');
    const nextIsBlank = nextLine.trim() === '';
    if (isTableRow && !nextIsTableRow && !nextIsBlank) {
      result.push('');
    }
  }

  // Chuyển citation refs [1] → [[1]](cite:1)
  return result.join('\n').replace(/\[(\d+)\]/g, '[[$1]](cite:$1)');
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const processedContent = preprocessMarkdown(content);

  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ node, ...props }) => <h2 className="md-h2" {...props} />,
          h3: ({ node, ...props }) => <h3 className="md-h3" {...props} />,
          p:  ({ node, ...props }) => <p className="md-p" {...props} />,
          ul: ({ node, ...props }) => <ul className="md-ul" {...props} />,
          ol: ({ node, ...props }) => <ol className="md-ol" {...props} />,
          a:  ({ node, href, children, ...props }) => {
            if (href?.startsWith('cite:')) {
              return <sup className="citation-ref">{children}</sup>;
            }
            return <a href={href} className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
          },
          code: ({ node, className, children, ...props }: any) => {
            // Check if it's inline or a block
            // ReactMarkdown passes inline as a boolean or we can infer it
            const match = /language-(\w+)/.exec(className || '');
            const isInline = props.inline ?? (!match && !String(children).includes('\n'));
            
            if (isInline) {
              return <code className="inline-code" {...props}>{children}</code>;
            }
            return (
              <pre className="code-block" {...props}>
                <code className={className}>{children}</code>
              </pre>
            );
          },
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-4 rounded-md border border-border">
              <table className="w-full border-collapse text-sm text-left" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => <thead className="bg-muted text-foreground" {...props} />,
          th: ({ node, ...props }) => <th className="border-b border-r last:border-r-0 border-border px-4 py-3 font-semibold" {...props} />,
          td: ({ node, ...props }) => <td className="border-b border-r last:border-r-0 border-border px-4 py-2" {...props} />,
          tbody: ({ node, ...props }) => <tbody className="[&>tr:last-child>td]:border-b-0" {...props} />,
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
