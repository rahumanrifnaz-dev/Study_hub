import { useEffect, useState } from "react";

const ScrollToFooterButton = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      // Show button if not at bottom
      setVisible(window.innerHeight + window.scrollY < document.body.offsetHeight - 100);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToFooter = () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  return visible ? (
    <button
      onClick={scrollToFooter}
      aria-label="Scroll to footer"
      className="fixed bottom-6 right-6 z-50 bg-neon-blue text-white rounded-full shadow-lg p-3 hover:bg-neon-purple transition-colors border-2 border-neon-blue"
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.2)", borderColor: "#4cc9f0" }}
    >
      ↓
    </button>
  ) : null;
};

export default ScrollToFooterButton;
