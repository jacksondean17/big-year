"use client";

import { useEffect, useRef, useState, useCallback } from "react";

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

export function BrainrotOverlay() {
  const [currentWord, setCurrentWord] = useState("");
  const [videoReady, setVideoReady] = useState(false);
  const [activated, setActivated] = useState(false);
  const playerRef = useRef<YT.Player | null>(null);
  const ttsTextRef = useRef("");

  useEffect(() => {
    document.documentElement.classList.add("brainrot");
    return () => {
      document.documentElement.classList.remove("brainrot");
    };
  }, []);

  // Load YouTube IFrame API and create player
  const playerContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;

    const initPlayer = () => {
      playerRef.current = new window.YT.Player(node, {
        videoId: "eRXE8Aebp7s",
        playerVars: {
          autoplay: 1,
          controls: 0,
          loop: 1,
          playlist: "eRXE8Aebp7s",
          playsinline: 1,
          disablekb: 1,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (event: YT.PlayerEvent) => {
            event.target.setPlaybackRate(2);
            event.target.mute();
            event.target.playVideo();
            setVideoReady(true);
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  }, []);

  // Collect TTS text once challenge-grid renders
  useEffect(() => {
    const collectText = () => {
      const grid = document.querySelector(".challenge-grid");
      if (!grid) return;
      const elements = grid.querySelectorAll(
        '[data-slot="card-title"], [data-slot="card-description"]'
      );
      const text = Array.from(elements)
        .map((el) => (el as HTMLElement).innerText || el.textContent || "")
        .join(". ");
      if (text.trim()) {
        ttsTextRef.current = text;
      }
    };

    // Try immediately, then observe
    collectText();
    if (ttsTextRef.current) return;

    const observer = new MutationObserver(() => {
      collectText();
      if (ttsTextRef.current) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  // Start TTS + unmute video on user click (browser requires user gesture)
  const activate = useCallback(() => {
    setActivated(true);

    // Unmute video
    if (playerRef.current) {
      playerRef.current.unMute();
      playerRef.current.setVolume(50);
    }

    // Start TTS
    const text = ttsTextRef.current;
    if (!text || !window.speechSynthesis) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 3;

    utterance.onboundary = (event) => {
      if (event.name === "word") {
        const spoken = text.substring(event.charIndex);
        const match = spoken.match(/^\S+/);
        if (match) {
          setCurrentWord(match[0]);
        }
      }
    };

    utterance.onend = () => {
      setCurrentWord("");
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  // Cleanup TTS on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  return (
    <>
      {/* Click-to-activate / loading banner */}
      {!activated && (
        <button
          onClick={videoReady ? activate : undefined}
          disabled={!videoReady}
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 10000,
            padding: "1.5rem 3rem",
            background: videoReady
              ? "linear-gradient(135deg, #00ff88, #00ffff, #ff00ff)"
              : "linear-gradient(135deg, #333, #555, #333)",
            color: videoReady ? "#000" : "#888",
            border: "none",
            borderRadius: "1rem",
            fontSize: "1.5rem",
            fontFamily: "Impact, sans-serif",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            cursor: videoReady ? "pointer" : "wait",
            boxShadow: videoReady
              ? "0 0 40px rgba(0, 255, 136, 0.6), 0 0 80px rgba(255, 0, 255, 0.3)"
              : "0 0 20px rgba(100, 100, 100, 0.3)",
            animation: videoReady
              ? "brainrot-pulse 1.5s ease-in-out infinite"
              : "brainrot-loading 2s linear infinite",
            backgroundSize: videoReady ? undefined : "200% 100%",
          }}
        >
          {videoReady ? "Click to activate brainrot" : "Loading brainrot..."}
        </button>
      )}

      {/* Subway Surfers video */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: "50vh",
          zIndex: 9998,
          overflow: "hidden",
        }}
      >
        <div
          ref={playerContainerRef}
          style={{ width: "100%", height: "100%" }}
        />
        {/* Transparent overlay to block interaction with the iframe */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
          }}
        />
      </div>

      {/* Flashing word overlay */}
      {currentWord && (
        <div
          style={{
            position: "fixed",
            bottom: "25vh",
            left: 0,
            right: 0,
            zIndex: 9999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontFamily: "Impact, sans-serif",
              fontSize: "clamp(3rem, 8vw, 6rem)",
              color: "#ffffff",
              textTransform: "uppercase",
              WebkitTextStroke: "3px #000000",
              textShadow:
                "0 0 20px rgba(0, 255, 136, 0.8), 0 0 40px rgba(255, 0, 255, 0.6)",
              userSelect: "none",
            }}
          >
            {currentWord}
          </span>
        </div>
      )}
    </>
  );
}
