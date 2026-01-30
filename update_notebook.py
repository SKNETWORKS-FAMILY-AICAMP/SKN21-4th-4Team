import json

nb_path = "/Users/kim/SKN/SKN21-4th-4Team/evaluation_advanced.ipynb"

with open(nb_path, "r", encoding="utf-8") as f:
    nb = json.load(f)

# Target source to find
target_source = [
    "eval_df = testset.to_pandas()\n",
    "eval_df.head()"
]

# New source code
new_code = """eval_df = testset.to_pandas()

# Reference 데이터 재생성 (ANALYSIS_SYSTEM_PROMPT 적용)
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from src.prompts import ANALYSIS_SYSTEM_PROMPT

# LLM 설정
gt_llm = ChatOpenAI(model=ConfigLLM.OPENAI_MODEL, temperature=0)
gt_prompt = ChatPromptTemplate.from_template(ANALYSIS_SYSTEM_PROMPT)
gt_chain = gt_prompt | gt_llm | StrOutputParser()

print("Reference 데이터 재생성 중...")
new_references = []
for idx, row in eval_df.iterrows():
    if isinstance(row['reference_contexts'], list):
        context_str = "\\n\\n".join(row['reference_contexts'])
    else:
        context_str = str(row['reference_contexts'])
    
    query = row['user_input']
    
    # Generate
    try:
        new_ref = gt_chain.invoke({"context": context_str, "query": query})
    except Exception as e:
        print(f"Error generating reference for query {query}: {e}")
        new_ref = row.get('reference', '') # Fallback to original
        
    new_references.append(new_ref)

eval_df['reference'] = new_references

# 다음 셀 호환성을 위한 데이터 준비
eval_data = eval_df.rename(columns={'user_input': 'question'}).to_dict('list')

eval_df.head()"""

# Convert new_code to list of strings with \n
new_source = []
lines = new_code.split("\n")
for i, line in enumerate(lines):
    if i < len(lines) - 1:
        new_source.append(line + "\n")
    else:
        new_source.append(line)

found = False
for cell in nb["cells"]:
    if cell["cell_type"] == "code":
        if cell["source"] == target_source:
             cell["source"] = new_source
             found = True
             break

if found:
    with open(nb_path, "w", encoding="utf-8") as f:
        json.dump(nb, f, indent=4, ensure_ascii=False)
    print("Successfully updated notebook.")
else:
    print("Target cell not found.")
    # Attempt fuzzy match
    for i, cell in enumerate(nb["cells"]):
        if cell["cell_type"] == "code" and len(cell["source"]) > 0:
            if "eval_df = testset.to_pandas()" in cell["source"][0]:
                print(f"Found fuzzy match at cell index {i}, updating...")
                cell["source"] = new_source
                with open(nb_path, "w", encoding="utf-8") as f:
                    json.dump(nb, f, indent=4, ensure_ascii=False)
                print("Successfully updated notebook (fuzzy).")
                found = True
                break
    
    if not found:
        print("Could not find cell to update.")
