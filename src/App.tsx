import { useCallback, useEffect, useRef, useState } from 'react';
import SpeechRecognition, {
  useSpeechRecognition,
} from 'react-speech-recognition';
import {
  GitHub,
  Settings,
  Plus,
  Mic,
  Info,
  Activity,
  Loader,
} from 'react-feather';
import Button from './design_system/Button';
import Message from './Message';

interface CreateChatGPTMessageResponse {
  answer: string;
  conversationId: string;
  messageId: string;
}

interface Message {
  type: 'prompt' | 'response';
  text: string;
}

function App() {
  const {
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
    transcript,
    listening: isListening,
    finalTranscript,
  } = useSpeechRecognition();
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { type: 'prompt', text: 'Where is the Empire State Building?' },
    {
      type: 'response',
      text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed sit amet elementum quam. Mauris sit amet tincidunt lacus. Quisque nec commodo ante. Duis ullamcorper suscipit lacus, a feugiat mauris. Integer rhoncus erat consequat nisi cursus porttitor.',
    },
  ]);
  const conversationRef = useRef({ id: '', currentMessageId: '' });
  const bottomDivRef = useRef<HTMLDivElement>(null);

  const recognizeSpeech = () => {
    if (isListening) {
      SpeechRecognition.abortListening();
    } else {
      window.speechSynthesis.cancel();
      SpeechRecognition.startListening();
    }
  };

  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  }, []);

  // Scroll to bottom when user is speaking a prompt
  useEffect(() => {
    if (isListening) {
      bottomDivRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isListening]);

  // Scroll to bottom when there is a new response
  useEffect(() => {
    bottomDivRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (finalTranscript) {
      setMessages((oldMessages) => [
        ...oldMessages,
        { type: 'prompt', text: finalTranscript },
      ]);

      setIsProcessing(true);

      fetch('http://localhost:8000/chatgpt/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: finalTranscript,
          conversationId: conversationRef.current.id || undefined,
          parentMessageId:
            conversationRef.current.currentMessageId || undefined,
        }),
      })
        .then((res) => res.json())
        .then((res: CreateChatGPTMessageResponse) => {
          conversationRef.current.id = res.conversationId;
          conversationRef.current.currentMessageId = res.messageId;
          setMessages((oldMessages) => [
            ...oldMessages,
            { type: 'response', text: res.answer },
          ]);
          speak(res.answer);
        })
        .catch((err: unknown) => {
          console.warn(err);
          const response = 'Failed to get the response, please try again';
          setMessages((oldMessages) => [
            ...oldMessages,
            { type: 'response', text: response },
          ]);
          speak(response);
        })
        .finally(() => {
          setIsProcessing(false);
        });
    }
  }, [finalTranscript, speak]);

  if (!browserSupportsSpeechRecognition) {
    return (
      <div>
        This browser doesn't support speech recognition. Please use Chrome.
      </div>
    );
  }

  return (
    <div className="px-8 py-9 flex flex-col h-screen gap-y-4">
      <header>
        <h1 className="font-title text-3xl text-center">
          ChatGPT
          <br />
          With Voice
          <div className="inline-block w-4 h-7 ml-2 align-middle bg-dark/40 animate-blink" />
        </h1>
        <div className="mt-4 flex justify-center">
          <a href="https://github.com/thanhsonng/chatgpt-voice" target="_blank">
            <GitHub strokeWidth={1} />
          </a>
        </div>
      </header>

      <main className="flex-1 flex flex-col gap-y-4 overflow-y-auto">
        {messages.map(({ type, text }, index) => {
          const getIsActive = () => {
            if (isListening) {
              return false;
            }
            if (type === 'prompt') {
              return (
                index === messages.length - 1 || index === messages.length - 2
              );
            }
            if (type === 'response') {
              return index === messages.length - 1;
            }
            return false;
          };
          return (
            <Message
              type={type}
              text={text}
              isActive={getIsActive()}
              onClick={speak}
            />
          );
        })}
        {isListening && <Message type="prompt" text={transcript} isActive />}
        <div ref={bottomDivRef} />
      </main>

      <div>
        <div className="flex gap-x-3 mb-6">
          <div className="shrink-0">
            <Info strokeWidth={1} />
          </div>
          <div>
            Run a local server on Desktop to see this works.{' '}
            <a className="underline">It's easy</a>.
          </div>
        </div>

        <div className="flex justify-center items-center gap-x-8">
          <Button>
            <Settings strokeWidth={1} />
          </Button>

          <button
            type="button"
            className={`w-16 h-16 ${
              isListening
                ? 'bg-accent1'
                : isProcessing
                ? 'bg-accent2'
                : 'bg-dark'
            } text-light flex justify-center items-center rounded-full transition-colors`}
            onClick={recognizeSpeech}
            disabled={isProcessing}
          >
            {isListening ? (
              <div className="animate-blink">
                <Activity strokeWidth={1} size={32} />
              </div>
            ) : isProcessing ? (
              <div className="animate-spin-2">
                <Loader strokeWidth={1} size={32} />
              </div>
            ) : (
              <Mic strokeWidth={1} size={32} />
            )}
          </button>

          <Button>
            <Plus strokeWidth={1} />
          </Button>
        </div>

        {!isMicrophoneAvailable && (
          <div>Please allow microphone permission for this app to work</div>
        )}
      </div>
    </div>
  );
}

export default App;
