import React from 'react';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useApp } from '../context/AppContext';

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
  // Sửa lỗi LLM trả về bullet '•' thay vì '-' và escape list '1\.'
  let processedContent = content
    .replace(/^(\s*)•\s/gm, '$1- ')
    .replace(/^(\s*\d+)\\\.\s/gm, '$1. ');

  const lines = processedContent.split('\n');
  const result: string[] = [];

  // Nhận diện dòng bắt đầu bằng list marker (vd: "1.", "a)", "a1)", "-", "+", "*", "“1.")
  const listMarkerRegex = /^["“']?(?:[a-zđA-ZĐ]\d*\)|[0-9]+\.|[-–+*])\s/i;
  // Nhận diện dòng kết thúc bằng dấu ngắt đoạn
  const endPunctuationRegex = /[.:;!?]["”']?\s*$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prevLine = i > 0 ? lines[i - 1] : '';
    const isTableRow = line.trimStart().startsWith('|');
    const prevIsTableRow = prevLine.trimStart().startsWith('|');
    const prevIsBlank = prevLine.trim() === '';

    // Xử lý table
    if (isTableRow) {
      if (!prevIsTableRow && !prevIsBlank) {
        result.push('');
      }
      result.push(line);

      const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
      const nextIsTableRow = nextLine.trimStart().startsWith('|');
      const nextIsBlank = nextLine.trim() === '';
      if (!nextIsTableRow && !nextIsBlank) {
        result.push('');
      }
      continue;
    }

    // Xử lý text thông thường (không phải table)
    const isListMarker = listMarkerRegex.test(line.trim());
    const prevEndsWithPunctuation = endPunctuationRegex.test(prevLine.trimEnd());

    // Nếu dòng trước không phải table và không rỗng
    if (i > 0 && !prevIsTableRow && !prevIsBlank) {
      // Ép xuống dòng (tạo paragraph mới) nếu:
      // 1. Dòng hiện tại là list item (a), b), 1.)
      // 2. HOẶC dòng trước kết thúc bằng dấu câu ngắt đoạn (. : ;)
      if (isListMarker || prevEndsWithPunctuation) {
        result.push('');
      }
    }

    result.push(line);
  }

  return result.join('\n');
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const processedContent = preprocessMarkdown(content);
  const { openReference } = useApp();


  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={(value: string) => {
          if (value.startsWith('legal://')) return value;
          return defaultUrlTransform(value);
        }}
        components={{
          h2: ({ node, ...props }) => <h2 className="md-h2" {...props} />,
          h3: ({ node, ...props }) => <h3 className="md-h3" {...props} />,
          p: ({ node, children, ...props }) => {
            let pClassName = "md-p";
            const firstChild = Array.isArray(children) ? children[0] : children;
            if (typeof firstChild === 'string') {
              const text = firstChild.trim();
              if (/^["“']?[a-zđA-ZĐ]\d+\)/.test(text)) {
                pClassName += " pl-8"; // Tiết: a1), b2) -> thụt vào mức 2
              } else if (/^["“']?[a-zđA-ZĐ]\)/.test(text) || /^["“']?[-–+*•]/.test(text) || /^["“']?\d+\./.test(text)) {
                pClassName += " pl-4"; // Điểm hoặc gạch đầu dòng: a), b), -, 1. -> thụt vào mức 1
              }
            }
            return <p className={pClassName} {...props}>{children}</p>;
          },
          ul: ({ node, ...props }) => <ul className="md-ul" {...props} />,
          ol: ({ node, ...props }) => <ol className="md-ol" {...props} />,
          a: ({ node, href, children, ...props }) => {
            if (href?.startsWith('legal://')) {
              return (
                <a
                  href={href}
                  className="text-blue-600 hover:text-blue-800 font-medium hover:underline cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    const match = href.match(/^legal:\/\/([^#]+)(?:#(.*))?$/);
                    if (match) {
                      const soKyHieu = match[1];
                      const targetId = match[2] || '';
                      openReference(soKyHieu, targetId);
                    }
                  }}
                  {...props}
                >
                  {children}
                </a>
              );
            }
            return (
              <a href={href} className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
            );
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
