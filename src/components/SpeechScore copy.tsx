import React, { useEffect, useState, useRef } from "react";

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

const VoiceCorrection: React.FC = () => {
  const [transcript, setTranscript] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("");
  const [improvementSuggestion, setImprovementSuggestion] =
    useState<string>("");
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [isRecognizing, setIsRecognizing] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (recognition) {
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "de-DE";

      recognition.onstart = () => {
        setIsRecognizing(true);
        startRecording(); // 开始录音
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const result = event.results[0][0].transcript;
        setTranscript(result);
        analyzePronunciation(result);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event);
        setIsRecognizing(false);
      };

      recognition.onend = () => {
        setIsRecognizing(false);
        stopRecording(); // 停止录音
      };
    }
  }, []);

  const startRecognition = () => {
    if (recognition) {
      recognition.start();
    }
  };

  const analyzePronunciation = (spokenText: string) => {
    const standardText = "Hallo, wie geht es dir?"; // 假设标准发音
    if (spokenText.toLowerCase() !== standardText.toLowerCase()) {
      setFeedback(
        `发音错误，您说的是 "${spokenText}"，正确的发音是 "${standardText}"。`
      );
      setImprovementSuggestion(
        "请注意 'Hallo' 的发音，确保清晰地发出每个音节。"
      );
    } else {
      setFeedback("发音正确！");
      setImprovementSuggestion("");
    }
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    audioChunksRef.current = [];

    mediaRecorderRef.current.ondataavailable = (event) => {
      audioChunksRef.current.push(event.data);
    };

    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
      const audioUrl = URL.createObjectURL(audioBlob);
      setRecordedAudio(audioUrl);
    };

    mediaRecorderRef.current.start();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  const playExample = () => {
    const utterance = new SpeechSynthesisUtterance(
      "HDas US-Verteidigungsministerium hat US-Medienberichten zufolge die Entsendung von Kampfjets nach Puerto Rico angeordnet. Die zehn Maschinen vom Typ F-35 sollten beim Kampf gegen Drogenkartelle unterstützen, berichteten etwa die Zeitung  New York Times , der Sender CBS News und das Portal  The Hill  unter Berufung auf einen Beamten des Verteidigungsministeriums beziehungsweise mit der Angelegenheit vertraute Quellen."
    );
    utterance.lang = "de-DE";
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div>
      <h1>德语语音识别与发音纠正</h1>
      <button onClick={playExample}>播放德语例句</button>
      <button onClick={startRecognition} disabled={isRecognizing}>
        开始识别
      </button>
      <p>识别结果: {transcript}</p>
      <p>{feedback}</p>
      <p>{improvementSuggestion}</p>
      {recordedAudio && (
        <div>
          <h2>您的发音回放</h2>
          <audio controls src={recordedAudio}></audio>
        </div>
      )}
    </div>
  );
};

export default VoiceCorrection;
