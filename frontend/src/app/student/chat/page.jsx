"use client";

import React, { useState } from 'react';
import ChatWithBook from '@/components/features/ChatWithBook';

export default function StudentChatPage() {
  const [chatReady, setChatReady] = useState(false);

  return (
    <div className="h-full w-full">
      <ChatWithBook onReady={setChatReady} />
    </div>
  );
}
