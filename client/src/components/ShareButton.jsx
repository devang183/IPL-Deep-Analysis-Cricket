import { useState, useRef } from 'react';
import { Share2, Download, MessageCircle, Facebook, Twitter, Linkedin, X, Check, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';

function ShareButton({ player, tabName, contentRef }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureSuccess, setCaptureSuccess] = useState(false);
  const dropdownRef = useRef(null);

  // Generate share text
  const getShareText = () => {
    return `Check out ${player}'s ${tabName} on IPL Cricket Analytics!`;
  };

  const getShareUrl = () => {
    return window.location.href;
  };

  // Capture screenshot and download
  const captureAndDownload = async () => {
    if (!contentRef?.current) {
      console.error('Content ref not available');
      return;
    }

    setIsCapturing(true);
    setCaptureSuccess(false);

    try {
      // Wait a bit to ensure all charts are rendered
      await new Promise(resolve => setTimeout(resolve, 500));

      // Store original scroll position
      const originalScrollTop = window.pageYOffset || document.documentElement.scrollTop;

      // Capture the content
      const canvas = await html2canvas(contentRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality
        logging: false,
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: false, // Disable foreign object rendering for better text support
        imageTimeout: 0, // No timeout for images
        windowWidth: contentRef.current.scrollWidth,
        windowHeight: contentRef.current.scrollHeight,
        width: contentRef.current.scrollWidth,
        height: contentRef.current.scrollHeight,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: -window.scrollY,
        onclone: (clonedDoc) => {
          // Force all text elements to use system fonts for better rendering
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach((el) => {
            const computedStyle = window.getComputedStyle(el);
            if (computedStyle.color) {
              el.style.color = computedStyle.color;
            }
            if (computedStyle.backgroundColor) {
              el.style.backgroundColor = computedStyle.backgroundColor;
            }
            if (computedStyle.fontSize) {
              el.style.fontSize = computedStyle.fontSize;
            }
            if (computedStyle.fontWeight) {
              el.style.fontWeight = computedStyle.fontWeight;
            }
            // Ensure font family is explicitly set
            el.style.fontFamily = 'Arial, Helvetica, sans-serif';

            // Remove any height constraints that might cut off content
            if (el.style.maxHeight) {
              el.style.maxHeight = 'none';
            }
            if (el.style.overflow === 'hidden' || el.style.overflow === 'auto') {
              el.style.overflow = 'visible';
            }
          });
        },
      });

      // Restore scroll position
      window.scrollTo(0, originalScrollTop);

      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          // Create download link
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          const fileName = `${player}_${tabName.replace(/\s+/g, '_')}_${new Date().getTime()}.png`;
          link.download = fileName;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);

          setCaptureSuccess(true);
          setTimeout(() => setCaptureSuccess(false), 2000);
        }
      }, 'image/png');
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      alert('Failed to capture screenshot. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  // Share to WhatsApp
  const shareToWhatsApp = () => {
    const text = encodeURIComponent(getShareText());
    const url = encodeURIComponent(getShareUrl());
    window.open(`https://wa.me/?text=${text}%20${url}`, '_blank');
    setIsOpen(false);
  };

  // Share to Facebook
  const shareToFacebook = () => {
    const url = encodeURIComponent(getShareUrl());
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
    setIsOpen(false);
  };

  // Share to Twitter
  const shareToTwitter = () => {
    const text = encodeURIComponent(getShareText());
    const url = encodeURIComponent(getShareUrl());
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'width=600,height=400');
    setIsOpen(false);
  };

  // Share to LinkedIn
  const shareToLinkedIn = () => {
    const url = encodeURIComponent(getShareUrl());
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank', 'width=600,height=400');
    setIsOpen(false);
  };

  // Use native Web Share API if available
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'IPL Cricket Analytics',
          text: getShareText(),
          url: getShareUrl(),
        });
        setIsOpen(false);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    }
  };

  // Copy link to clipboard
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      alert('Link copied to clipboard!');
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all shadow-md hover:shadow-lg"
        aria-label="Share options"
        aria-expanded={isOpen}
      >
        <Share2 className="w-4 h-4" />
        <span className="font-medium">Share</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-primary-50 to-primary-100 border-b border-primary-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Share Analytics</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-500 hover:text-slate-700"
                  aria-label="Close share menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Share Options */}
            <div className="py-2">
              {/* Download Screenshot */}
              <button
                onClick={captureAndDownload}
                disabled={isCapturing}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left disabled:opacity-50"
              >
                {isCapturing ? (
                  <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
                ) : captureSuccess ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Download className="w-5 h-5 text-slate-600" />
                )}
                <div className="flex-1">
                  <div className="font-medium text-slate-800">
                    {isCapturing ? 'Capturing...' : captureSuccess ? 'Downloaded!' : 'Save as Image'}
                  </div>
                  <div className="text-xs text-slate-500">Download PNG to device</div>
                </div>
              </button>

              <div className="border-t border-slate-200 my-2" />

              {/* WhatsApp */}
              <button
                onClick={shareToWhatsApp}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-green-50 transition-colors text-left group"
              >
                <MessageCircle className="w-5 h-5 text-green-600 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="font-medium text-slate-800">WhatsApp</div>
                  <div className="text-xs text-slate-500">Share via WhatsApp</div>
                </div>
              </button>

              {/* Facebook */}
              <button
                onClick={shareToFacebook}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left group"
              >
                <Facebook className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="font-medium text-slate-800">Facebook</div>
                  <div className="text-xs text-slate-500">Share on Facebook</div>
                </div>
              </button>

              {/* Twitter */}
              <button
                onClick={shareToTwitter}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-sky-50 transition-colors text-left group"
              >
                <Twitter className="w-5 h-5 text-sky-600 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="font-medium text-slate-800">Twitter</div>
                  <div className="text-xs text-slate-500">Share on Twitter</div>
                </div>
              </button>

              {/* LinkedIn */}
              <button
                onClick={shareToLinkedIn}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left group"
              >
                <Linkedin className="w-5 h-5 text-blue-700 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="font-medium text-slate-800">LinkedIn</div>
                  <div className="text-xs text-slate-500">Share on LinkedIn</div>
                </div>
              </button>

              {/* Native Share (Mobile) */}
              {navigator.share && (
                <>
                  <div className="border-t border-slate-200 my-2" />
                  <button
                    onClick={handleNativeShare}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left group"
                  >
                    <Share2 className="w-5 h-5 text-slate-600 group-hover:scale-110 transition-transform" />
                    <div>
                      <div className="font-medium text-slate-800">More Options</div>
                      <div className="text-xs text-slate-500">Use device share menu</div>
                    </div>
                  </button>
                </>
              )}

              {/* Copy Link */}
              <div className="border-t border-slate-200 my-2" />
              <button
                onClick={copyLink}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
              >
                <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                <div>
                  <div className="font-medium text-slate-800">Copy Link</div>
                  <div className="text-xs text-slate-500">Copy URL to clipboard</div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ShareButton;
