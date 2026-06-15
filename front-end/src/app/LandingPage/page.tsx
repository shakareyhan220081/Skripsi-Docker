'use client';
import Chatbot from '../chatbot/chatbot';

export default function Home() {
  return (
    <main className='h-screen w-full overflow-hidden flex items-center justify-center bg-background text-foreground'>
      <div className='w-full max-w-8xl'>
        <Chatbot />
      </div>
    </main>
  );
}
