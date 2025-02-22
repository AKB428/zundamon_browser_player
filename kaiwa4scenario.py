import os
import ollama         # ollama の公式ライブラリ
import requests
import json
import tempfile
import re

# VOICEVOX の設定（今回は使用しないが、参考として残す）
VOICEVOX_HOST = os.environ.get("VOICEVOX_HOST", "localhost")
VOICEVOX_PORT = 50021  # 固定ポート

# ---------------------------------------------
# プロンプト入力（複数行対応）を取得する関数
# ---------------------------------------------
def get_prompt_input():
    r"""
    ユーザーにシナリオ生成用プロンプトを入力させる関数です。
    入力が \"\"\" で始まる場合、複数行入力モードとし、末尾の \"\"\" で終了します。
    それ以外の場合は、1行の入力として扱います。
    """
    first_line = input("シナリオ生成用プロンプトを入力してください: ")
    if first_line.startswith('"""'):
        content = first_line[3:]
        if content.endswith('"""'):
            return content[:-3].strip()
        lines = [content]
        while True:
            line = input()
            if line.endswith('"""'):
                lines.append(line[:-3])
                break
            else:
                lines.append(line)
        return "\n".join(lines).strip()
    else:
        return first_line

# ---------------------------------------------
# 1. LLMで会話シナリオを生成する関数
# ---------------------------------------------
def generate_scenario(prompt):
    """
    指定されたテーマに沿って、ずんだもんと四国めたんが議論するシナリオを生成する。

    以下のキャラクター口調の特徴を必ず反映すること：

    【ずんだもんの口調の特徴】
      ・ずんだもんは、語尾に「なのだ」や「のだ」をつけるのが特徴です。
      ・また、柔らかく優しい口調で話します。

    【四国めたんの口調の特徴】
      ・四国めたんは、誰にでもタメ口で話します。
      ・「〜かしら」や「〜わよ」のような高飛車な口調で話すのが特徴です。

    ※ 出力形式は必ず以下の形式に従うこと：
         ずんだもん:「発言内容」
         四国めたん:「発言内容」
    各発話は1行で出力してください。発言内容には必ず「」をつけること。

    ※ JSON形式での直接出力は精度が懸念されるため、ここではテキスト形式をパースして後からJSON化します。
    """
    messages = [
        {
            "role": "system",
            "content": (
                "あなたは会話シナリオ生成エンジンです。以下のキャラクター口調の特徴に基づいて、"
                "指定されたテーマに沿ったずんだもんと四国めたんの議論シナリオを生成してください。\n\n"
                "【ずんだもんの口調の特徴】\n"
                "・ずんだもんは、語尾に「なのだ」や「のだ」をつけるのが特徴です。\n"
                "・また、柔らかく優しい口調で話します。\n\n"
                "【四国めたんの口調の特徴】\n"
                "・四国めたんは、誰にでもタメ口で話します。\n"
                "・「〜かしら」や「〜わよ」のような高飛車な口調で話すのが特徴です。\n\n"
                "※ 出力形式は必ず以下の形式に従うこと：\n"
                "ずんだもん:「発言内容」\n"
                "四国めたん:「発言内容」\n"
                "各発話は1行で出力してください。発言内容には必ず「」をつけること。\n"
            )
        },
        {"role": "user", "content": prompt}
    ]
    
    result = ollama.chat(model="phi4", messages=messages)
    try:
        scenario = result["message"]["content"]
    except KeyError:
        scenario = "シナリオの生成に失敗しました。"
    return scenario

# ---------------------------------------------
# 2. シナリオテキストを解析して発話ごとに分割する関数
# ---------------------------------------------
def parse_scenario(scenario_text):
    """
    シナリオテキストを行ごとに分割し、各行から発話者と発言内容を抽出する。
    例）
      入力行：　ずんだもん:「オーバーツーリズムって、〜」
      出力： {"character": "ずんだもん", "serif": "オーバーツーリズムって、〜", ...}
    
    さらに、キャラクターに応じて以下のプロパティを自動付与する：
      ・ずんだもんの場合:
          images: ["ずんだもん-喋り1.png", "ずんだもん-喋り2.png"],
          color: "#00ff00"
      ・四国めたんの場合:
          images: ["四国めたん-喋り1.png", "四国めたん-喋り2.png"],
          color: "#ff00ff"
      ・sound はシーケンシャルに "1.wav", "2.wav", ... と設定
    """
    conversation = []
    pattern = re.compile(r'^(ずんだもん|四国めたん)\s*[:：]\s*「([^」]+)」')
    lines = scenario_text.strip().splitlines()
    sound_index = 1
    for line in lines:
        line = line.strip()
        match = pattern.match(line)
        if match:
            speaker = match.group(1).strip()
            text = match.group(2).strip()
            if speaker == "ずんだもん":
                images = ["ずんだもん-喋り1.png", "ずんだもん-喋り2.png"]
                color = "#00ff00"
            elif speaker == "四国めたん":
                images = ["四国めたん-喋り1.png", "四国めたん-喋り2.png"]
                color = "#ff00ff"
            else:
                images = []
                color = "#ffffff"
            sound = f"{sound_index}.wav"
            sound_index += 1
            conversation.append({
                "character": speaker,
                "serif": text,
                "sound": sound,
                "images": images,
                "color": color
            })
    return conversation

# ---------------------------------------------
# 3. シナリオ設定ファイル（scenario.json）を生成する関数
# ---------------------------------------------
def build_scenario_json(conversation):
    """
    解析した会話（発話リスト）をもとに、シナリオ設定ファイルのJSON構造を生成する。
    ※ 背景は出力時に各シーンごとに setBackground を出力するが、基本は固定背景とする。
    """
    scenario_json = {
        "backgrounds": {
            "1": "bg1.png",
            "2": "bg2.png"
        },
        "defaultLeftCharacter": "四国めたん-ノーマル.png",
        "defaultRightCharacter": "ずんだもん-ノーマル.png",
        "scenes": []
    }
    
    # ここでは、2名の会話が終わるごとに1シーンとする
    # 今回はconversationは発話リスト（各発話の辞書）のリストとする
    # 例えば、2つの発話（ずんだもんと四国めたん）のペアを1シーンにまとめる
    for i in range(0, len(conversation), 2):
        scene_lines = conversation[i:i+2]
        # シーンの背景は固定（後から手動で変更しやすいように setBackground "1" を入れる）
        scene = {
            "setBackground": "1",
            "lines": scene_lines
        }
        scenario_json["scenes"].append(scene)
    return scenario_json

# ---------------------------------------------
# 4. メイン処理
# ---------------------------------------------
def main():
    # 複数行入力に対応したプロンプトを取得
    prompt = get_prompt_input()
    
    # LLMでシナリオ生成（テキスト形式）
    scenario_text = generate_scenario(prompt)
    print("\n===== 生成されたシナリオ（テキスト） =====")
    print(scenario_text)
    print("============================================\n")
    
    # シナリオテキストを解析
    conversation = parse_scenario(scenario_text)
    if not conversation:
        print("シナリオの解析に失敗しました。パースできる発話が見つかりませんでした。")
        return
    
    # 解析結果をもとに scenario.json の構造を生成
    scenario_json = build_scenario_json(conversation)
    
    # JSONファイルとして出力
    output_filename = "scenario.json"
    with open(output_filename, "w", encoding="utf-8") as f:
        json.dump(scenario_json, f, ensure_ascii=False, indent=2)
    
    print(f"シナリオ設定ファイル '{output_filename}' を出力しました。")
    
if __name__ == '__main__':
    main()
