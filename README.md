# ずんだもん寸劇　シナリオ生成＆ブラウザープレイヤー

![サンプル](./sample.jpg)

## 概要

ずんだもんと四国めたんの寸劇をシナリオファイルを書けばブラウザで再現できるJSエンジンです

シナリオはLLMでも生成可能

## 準備

VOICEVOXをインストール　https://voicevox.hiroshiba.jp/

VOICEVOXを起動してサーバーAPIを使用

## 手順1 シナリオのライティング

シナリオファイルを書くscenario.json などを変更
scenario.jsonにあわせてプログラムやLLM等で生成してもよい

### ライティング方法1. LLMでのシナリオ出力 Ollamaサーバーを使用

```
python3 kaiwa4scenario.py
シナリオ生成用プロンプトを入力してください: """
北海道に旅行にいく計画をたててそのあと実際に観光をする2名の会話をかいてみてください
北海道の名所を紹介する動画風のシナリオ
"""
```

### ライティング方法2. 会話形式テキストをあらかじめ作成し読み込ませる

下記のような形式のテキストファイルを用意

```
四国めたん:「で、次はどこへ行ったの？」  
ずんだもん:「『ポピーとよさか』なのだ！新潟駅から数駅のところにあって、レトロ自販機があることで有名なのだ！」  
四国めたん:「レトロ自販機って？」  
ずんだもん:「トースト200円、うどん400円とか、昭和の雰囲気が味わえるのだ！」  
四国めたん:「ふーん。でも、肝心の脱衣麻雀は？」  
ずんだもん:「なかったのだ……。でも、上海2が6台並んでいる『上海パラダイス』は圧巻だったのだ！」  
四国めたん:「上海って、あの麻雀牌を使ったパズルゲームね？」  
ずんだもん:「そうなのだ！でも、麻雀配列のマシンは電源が入ってなくて未プレイだったのだ……。」  
```

下記コマンドでJSONに変換

```
python3 kaiwa4scenario.py --file scenario.txt 
```

## 手順2 シナリオJSONを読み込み音声をVOICEVOXで生成するツールを実行

### BUILD

```
go build -o voice_generator main.go
```

Windows用にコンパイル（WSLやMacでWindowsバイナリを出力したいとき）

```
GOOS=windows go build -o voice_generator.exe main.go
```

### 実行
```
./voice_generator scenario.json 
```

## サーバー経由でindex.htmlをブラウザで開く

VSCodeの「Live Preview拡張」などサーバー経由でindex.htmlを開く（リソース読み込みのため）


## 寸劇サンプル動画

https://youtu.be/xfD-iXySyfA

## デモページ

https://akb428.github.io/zundamon_browser_player/


## イラストなど素材元

ずんだもんの音声　https://voicevox.hiroshiba.jp/

イラスト　https://www.the-time.jp/tachie/

イラスト素材のPSDのパース　https://oov.github.io/psdtool/
