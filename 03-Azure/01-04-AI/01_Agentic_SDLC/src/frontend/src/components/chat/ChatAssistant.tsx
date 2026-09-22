import { useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useMutation } from 'react-query';
import { getChatErrorMessage, sendChat, SendChatRequest } from '../../api/chat';
import { useTheme } from '../../context/ThemeContext';
import type { ChatHistoryMessage, ChatResponse } from '../../types/chat';
import ChatComposer from './ChatComposer';
import ChatResults from './ChatResults';

interface ConversationItem {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  imageName?: string;
  response?: ChatResponse;
}

const suggestions = [
  'What helps monitor overeating?',
  'Show me discounted products.',
  'Which suppliers are verified?',
];

export default function ChatAssistant() {
  const { darkMode } = useTheme();
  const [message, setMessage] = useState('');
  const [image, setImage] = useState<File>();
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const abortController = useRef<AbortController | null>(null);
  const nextId = useRef(1);
  const mutation = useMutation((request: SendChatRequest) => sendChat(request), {
    onSuccess: (response) => {
      setConversation((items) => [...items, {
        id: nextId.current++,
        role: 'assistant',
        text: response.answer,
        response,
      }]);
    },
  });

  const submit = () => {
    const trimmedMessage = message.trim();
    if ((!trimmedMessage && !image) || mutation.isLoading) {
      return;
    }

    const history: ChatHistoryMessage[] = conversation
      .map(({ role, text }) => ({ role, content: text }))
      .slice(-6);
    setConversation((items) => [...items, {
      id: nextId.current++,
      role: 'user',
      text: trimmedMessage || 'Find products similar to this image.',
      imageName: image?.name,
    }]);
    const controller = new AbortController();
    abortController.current = controller;
    mutation.mutate({ message: trimmedMessage, image, history, signal: controller.signal });
    setMessage('');
    setImage(undefined);
  };

  const pageClass = `min-h-screen px-4 pb-14 pt-24 ${darkMode ? 'bg-dark text-light' : 'bg-gray-100 text-gray-900'}`;

  return (
    <main className={pageClass}>
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 border-b border-primary pb-4">
          <p className="text-sm font-semibold uppercase text-primary">Catalog assistant</p>
          <h1 className="text-3xl font-bold">Find the right product</h1>
          <p className={`mt-2 max-w-2xl ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Ask by need, budget, or supplier, or attach a photo to find the closest catalog match.
          </p>
        </header>

        <section className={`flex min-h-[620px] flex-col overflow-hidden border ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`} aria-label="Catalog assistant conversation">
          <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6" aria-live="polite">
            {conversation.length === 0 ? (
              <div className="mx-auto flex max-w-xl flex-col items-center py-16 text-center">
                <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-full ${darkMode ? 'bg-gray-700 text-primary' : 'bg-gray-100 text-primary'}`}>
                  <Search size={26} />
                </div>
                <h2 className="text-xl font-semibold">Search the catalog naturally</h2>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setMessage(suggestion)}
                      className={`rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100'}`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              conversation.map((item) => (
                <article key={item.id} className={item.role === 'user' ? 'ml-auto max-w-2xl' : 'max-w-3xl'}>
                  <p className="mb-1 text-xs font-semibold uppercase text-primary">
                    {item.role === 'user' ? 'You' : 'Assistant'}
                  </p>
                  <div className={`border-l-4 p-4 ${item.role === 'user' ? 'border-gray-400 bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white' : 'border-primary bg-primary/5'}`}>
                    {item.response ? <ChatResults response={item.response} darkMode={darkMode} /> : <p>{item.text}</p>}
                    {item.imageName && <p className="mt-2 text-xs opacity-70">Attached: {item.imageName}</p>}
                  </div>
                </article>
              ))
            )}
            {mutation.isLoading && <p role="status" className="text-sm text-primary">Searching the catalog...</p>}
            {mutation.isError && <p role="alert" className="text-sm text-red-600">{getChatErrorMessage(mutation.error)}</p>}
          </div>

          <ChatComposer
            message={message}
            image={image}
            pending={mutation.isLoading}
            darkMode={darkMode}
            onMessageChange={(value) => {
              setMessage(value);
              if (mutation.isError) {
                mutation.reset();
              }
            }}
            onImageChange={setImage}
            onSubmit={submit}
            onCancel={() => abortController.current?.abort()}
          />
        </section>
      </div>
    </main>
  );
}