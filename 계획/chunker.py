import re

def chunk_law_markdown(markdown_text: str) -> list[dict]:
    """
    조문 단위 청킹 + 표(Table) 컨텍스트 보존 로직.
    표 안의 데이터를 유실하지 않고 앞 2문장과 각주를 함께 묶어 보존합니다.
    """
    chunks = []
    lines = markdown_text.split("\n")
    current_chunk_lines = []
    current_article = ""
    in_table = False

    for line in lines:
        is_table_line = line.strip().startswith("|")
        is_footnote = line.strip().startswith("※")

        if is_table_line and not in_table:
            in_table = True
            if len(current_chunk_lines) >= 2:
                pre_table_context = current_chunk_lines[-2:]
                current_chunk_lines = current_chunk_lines[:-2]
                if current_chunk_lines:
                    chunks.append({"text": "\n".join(current_chunk_lines), "article": current_article, "type": "text"})
                current_chunk_lines = pre_table_context

        if in_table and not is_table_line:
            in_table = False
            current_chunk_lines.append(line)
            chunks.append({"text": "\n".join(current_chunk_lines), "article": current_article, "type": "table"})
            current_chunk_lines = []
            continue

        current_chunk_lines.append(line)

    if current_chunk_lines:
        chunks.append({"text": "\n".join(current_chunk_lines), "article": current_article, "type": "text"})

    return chunks