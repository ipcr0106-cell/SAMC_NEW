import re

async def clean_law_markdown(raw_markdown: str) -> str:
    """
    kordoc 변환 후 잘린 줄, 이상 문자를 정제하는 로직.
    기존 데이터를 삭제하지 않고 끊어진 문장만 이전 줄에 병합(Merge)합니다.
    """
    lines = raw_markdown.split("\n")
    merged = []
    for i, line in enumerate(lines):
        # 조문 번호로 시작하지 않고 이전 줄이 문장 기호로 끝나지 않은 경우 병합
        if (merged and line and
            not line.startswith(("#", "|", "제", "1", "2", "3", "4", "5", "가", "나", "※", "-")) and
            not merged[-1].endswith((".", "다.", "한다.", "된다.", "한다", "한다."))):
            merged[-1] = merged[-1] + " " + line.strip()
        else:
            merged.append(line)

    return "\n".join(merged)