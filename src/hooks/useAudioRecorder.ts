import { useState, useEffect, useCallback } from "react";

const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 初始化录音
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const context = new (window.AudioContext || window.AudioContext)();

      setMediaStream(stream);
      setAudioContext(context);
      setIsRecording(true);
      setError(null);

      return { stream, context };
    } catch (err) {
      setError("无法访问麦克风: " + (err as Error).message);
      setIsRecording(false);
      return null;
    }
  }, []);

  // 停止录音
  const stopRecording = useCallback(() => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
    }
    setIsRecording(false);
  }, [mediaStream]);

  // 清理资源
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
      if (audioContext && audioContext.state !== "closed") {
        audioContext.close();
      }
    };
  }, [mediaStream, audioContext]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    audioContext,
    mediaStream,
    error,
  };
};

export default useAudioRecorder;
