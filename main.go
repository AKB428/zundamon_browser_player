package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
)

// シナリオ用の構造体（必要なフィールドのみ）
type Scenario struct {
	Backgrounds           map[string]string `json:"backgrounds"`
	DefaultLeftCharacter  string            `json:"defaultLeftCharacter"`
	DefaultRightCharacter string            `json:"defaultRightCharacter"`
	Scenes                []Scene           `json:"scenes"`
}

type Scene struct {
	SetBackground string `json:"setBackground"`
	Lines         []Line `json:"lines"`
}

type Line struct {
	Character string   `json:"character"`
	Serif     string   `json:"serif"`
	Sound     string   `json:"sound"`
	Images    []string `json:"images"`
	Color     string   `json:"color"`
}

func main() {
	// シナリオJSONファイルのパス（例：scenario.json）
	if len(os.Args) < 2 {
		log.Fatalf("Usage: %s <scenario.json>", os.Args[0])
	}
	jsonPath := os.Args[1]

	// JSONファイルを読み込み
	data, err := ioutil.ReadFile(jsonPath)
	if err != nil {
		log.Fatalf("failed to read JSON file: %v", err)
	}

	var scenario Scenario
	if err := json.Unmarshal(data, &scenario); err != nil {
		log.Fatalf("failed to unmarshal JSON: %v", err)
	}

	// VOICEVOXのホストとポート取得
	voicevoxHost := os.Getenv("VOICEVOX_HOST")
	if voicevoxHost == "" {
		voicevoxHost = "localhost"
	}
	voicevoxPort := os.Getenv("VOICEVOX_PORT")
	if voicevoxPort == "" {
		voicevoxPort = "50021"
	}
	baseURL := fmt.Sprintf("http://%s:%s", voicevoxHost, voicevoxPort)

	client := &http.Client{}

	// 各シーン、各行に対して処理を実施
	for _, scene := range scenario.Scenes {
		for _, line := range scene.Lines {
			// キャラクターに応じたspeaker番号を決定
			var speaker int
			switch line.Character {
			case "ずんだもん":
				speaker = 3
			case "四国めたん":
				speaker = 2
			default:
				log.Printf("unknown character %s, skipping", line.Character)
				continue
			}

			text := line.Serif

			// 1. audio_query を実行（POSTリクエスト、クエリパラメータでtextとspeakerを渡す）
			audioQueryURL, err := url.Parse(fmt.Sprintf("%s/audio_query", baseURL))
			if err != nil {
				log.Printf("failed to parse audio_query URL: %v", err)
				continue
			}
			queryParams := url.Values{}
			queryParams.Set("text", text)
			queryParams.Set("speaker", fmt.Sprintf("%d", speaker))
			audioQueryURL.RawQuery = queryParams.Encode()

			// bodyはなし
			reqAQ, err := http.NewRequest("POST", audioQueryURL.String(), nil)
			if err != nil {
				log.Printf("failed to create audio_query request: %v", err)
				continue
			}

			respAQ, err := client.Do(reqAQ)
			if err != nil {
				log.Printf("audio_query request failed: %v", err)
				continue
			}
			if respAQ.StatusCode != http.StatusOK {
				bodyBytes, _ := ioutil.ReadAll(respAQ.Body)
				respAQ.Body.Close()
				log.Printf("audio_query failed: status=%d, body=%s", respAQ.StatusCode, string(bodyBytes))
				continue
			}
			queryBody, err := ioutil.ReadAll(respAQ.Body)
			respAQ.Body.Close()
			if err != nil {
				log.Printf("failed to read audio_query response: %v", err)
				continue
			}

			// 2. synthesis を実行
			synthesisURL, err := url.Parse(fmt.Sprintf("%s/synthesis", baseURL))
			if err != nil {
				log.Printf("failed to parse synthesis URL: %v", err)
				continue
			}
			synthParams := url.Values{}
			synthParams.Set("speaker", fmt.Sprintf("%d", speaker))
			synthesisURL.RawQuery = synthParams.Encode()

			reqSynth, err := http.NewRequest("POST", synthesisURL.String(), bytes.NewReader(queryBody))
			if err != nil {
				log.Printf("failed to create synthesis request: %v", err)
				continue
			}
			reqSynth.Header.Set("Content-Type", "application/json")

			respSynth, err := client.Do(reqSynth)
			if err != nil {
				log.Printf("synthesis request failed: %v", err)
				continue
			}
			if respSynth.StatusCode != http.StatusOK {
				bodyBytes, _ := ioutil.ReadAll(respSynth.Body)
				respSynth.Body.Close()
				log.Printf("synthesis failed: status=%d, body=%s", respSynth.StatusCode, string(bodyBytes))
				continue
			}

			// 保存するファイル名は line.Sound に指定
			soundFileName := line.Sound
			if err := os.MkdirAll(filepath.Dir(soundFileName), os.ModePerm); err != nil {
				log.Printf("failed to create directories for %s: %v", soundFileName, err)
				respSynth.Body.Close()
				continue
			}

			outFile, err := os.Create(soundFileName)
			if err != nil {
				log.Printf("failed to create output file %s: %v", soundFileName, err)
				respSynth.Body.Close()
				continue
			}
			_, err = io.Copy(outFile, respSynth.Body)
			if err != nil {
				log.Printf("failed to write audio data to %s: %v", soundFileName, err)
			} else {
				log.Printf("saved audio file: %s", soundFileName)
			}
			outFile.Close()
			respSynth.Body.Close()
		}
	}
}
