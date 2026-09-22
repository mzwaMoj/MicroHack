import { ChangeEvent, FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { ImagePlus, Send, Square, X } from 'lucide-react';

interface ChatComposerProps {
  message: string;
  image?: File;
  pending: boolean;
  darkMode: boolean;
  onMessageChange: (message: string) => void;
  onImageChange: (image?: File) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function ChatComposer({
  message,
  image,
  pending,
  darkMode,
  onMessageChange,
  onImageChange,
  onSubmit,
  onCancel,
}: ChatComposerProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string>();

  useEffect(() => {
    if (!image) {
      setPreviewUrl(undefined);
      return;
    }
    const nextUrl = URL.createObjectURL(image);
    setPreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [image]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!pending && (message.trim() || image)) {
      onSubmit();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!pending && (message.trim() || image)) {
        onSubmit();
      }
    }
  };

  const selectImage = (event: ChangeEvent<HTMLInputElement>) => {
    onImageChange(event.target.files?.[0]);
  };

  return (
    <form onSubmit={submit} className={`border-t p-3 sm:p-4 ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}>
      {previewUrl && image && (
        <div className={`mb-3 flex items-center gap-3 border p-2 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
          <img src={previewUrl} alt="Selected product" className="h-14 w-14 rounded object-cover" />
          <p className="min-w-0 flex-1 truncate text-sm">{image.name}</p>
          <button
            type="button"
            onClick={() => {
              onImageChange(undefined);
              if (fileInput.current) {
                fileInput.current.value = '';
              }
            }}
            className="rounded p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary dark:hover:bg-gray-700 dark:hover:text-white"
            aria-label="Remove selected image"
            title="Remove image"
          >
            <X size={18} />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={selectImage}
          className="sr-only"
          aria-label="Attach a product image"
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={pending}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md border focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 ${darkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}
          aria-label="Attach a product image"
          title="Attach image"
        >
          <ImagePlus size={20} />
        </button>
        <label className="min-w-0 flex-1">
          <span className="sr-only">Ask about the catalog</span>
          <textarea
            value={message}
            onChange={(event) => onMessageChange(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            maxLength={2000}
            disabled={pending}
            placeholder="Describe what you need or attach a product image"
            className={`block max-h-32 min-h-11 w-full resize-y rounded-md border px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 ${darkMode ? 'border-gray-700 bg-gray-800 text-white placeholder:text-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-500'}`}
          />
        </label>
        {pending ? (
          <button
            type="button"
            onClick={onCancel}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-gray-700 text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Cancel request"
            title="Cancel"
          >
            <Square size={18} fill="currentColor" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!message.trim() && !image}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary text-white hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send message"
            title="Send"
          >
            <Send size={19} />
          </button>
        )}
      </div>
    </form>
  );
}