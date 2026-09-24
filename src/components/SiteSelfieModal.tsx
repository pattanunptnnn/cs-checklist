"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  X,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  MapPin,
  Clock,
  User,
  ShieldCheck,
  SwitchCamera,
  Upload,
  Image as ImageIcon,
} from "lucide-react";

interface SiteSelfieModalProps {
  isOpen: boolean;
  onClose: () => void;
  pmName?: string;
  storeName?: string;
  storeCode?: string;
  coords?: { lat: number; lng: number; accuracy?: number } | null;
  onSaveSelfie: (photoUrl: string) => Promise<void> | void;
}

export default function SiteSelfieModal({
  isOpen,
  onClose,
  pmName,
  storeName,
  storeCode,
  coords,
  onSaveSelfie,
}: SiteSelfieModalProps) {
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [cameraError, setCameraError] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  // หยุดกล้องและคืนทรัพยากร
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setStream(null);
    setIsCameraActive(false);
  }, [stream]);

  // เริ่มต้นเปิดกล้อง Live Video
  const startCamera = useCallback(async () => {
    setCameraError("");
    setErrorMsg("");

    // หยุด stream เดิมก่อน
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError("เบราว์เซอร์นี้ไม่รองรับการเปิดกล้องสด กรุณากดปุ่ม 'เปิดกล้องมือถือ' ด้านล่าง");
      return;
    }

    try {
      let mediaStream: MediaStream | null = null;

      // พยายามเปิดตาม facingMode ที่ต้องการ
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 960 },
          },
          audio: false,
        });
      } catch (err1) {
        console.warn("Attempt 1 with resolution failed, trying basic facingMode:", err1);
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facingMode },
            audio: false,
          });
        } catch (err2) {
          console.warn("Attempt 2 failed, trying any video stream:", err2);
        }
      }

      // Fallback ครั้งสุดท้าย: เปิดกล้องใดๆ ที่มี
      if (!mediaStream) {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      setStream(mediaStream);
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn("getUserMedia failed completely:", err);
      setCameraError(
        "ไม่สามารถเปิดกล้องได้ (อาจยังไม่อนุญาตสิทธิ์ Camera หรือไม่มีกล้อง) กรุณากดปุ่ม 'ถ่ายด้วยกล้องมือถือ' ด้านล่าง"
      );
    }
  }, [facingMode, stream]);

  // ผูก MediaStream กับ <video> element เสมอ
  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play().catch((playErr) => {
          console.warn("Video play error:", playErr);
        });
      };
    }
  }, [stream]);

  // ควบคุมการเปิด/ปิดกล้องตามสถานะ Modal
  useEffect(() => {
    if (isOpen && !previewUrl) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, previewUrl]);

  // สลับกล้องหน้า / กล้องหลัง
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  // ประทับลายน้ำลงบนรูปภาพ
  const stampWatermark = async (imageSource: CanvasImageSource, width: number, height: number): Promise<Blob> => {
    const canvas = document.createElement("canvas");
    const MAX_DIM = 1600;
    let targetW = width;
    let targetH = height;
    if (Math.max(width, height) > MAX_DIM) {
      const scale = MAX_DIM / Math.max(width, height);
      targetW = Math.round(width * scale);
      targetH = Math.round(height * scale);
    }

    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context is not available");

    // วาดภาพถ่าย
    if (facingMode === "user" && isCameraActive) {
      ctx.translate(targetW, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(imageSource, 0, 0, targetW, targetH);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    } else {
      ctx.drawImage(imageSource, 0, 0, targetW, targetH);
    }

    // วาดลายน้ำระบุตัวตน PM On-Site
    const scale = Math.max(0.8, Math.min(1.6, targetW / 1200));
    const padX = Math.round(16 * scale);
    const padY = Math.round(12 * scale);
    const fontSizeTitle = Math.round(14 * scale);
    const fontSizeBody = Math.round(12 * scale);
    const lineGap = Math.round(18 * scale);

    const now = new Date();
    const dateStr = now.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
    const timeStr = now.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const line1 = `BIG-C SITE VERIFICATION · SELFIE`;
    const line2 = `👤 ผู้ตรวจ (PM): ${pmName || "วิศวกรผู้ตรวจ Big-C"}`;
    const line3 = `📍 ไซต์งาน: ${storeName || "สาขาหน้างาน"}${storeCode ? ` (${storeCode})` : ""}`;
    const line4 = `⏰ วันเวลา: ${dateStr} ${timeStr} น.`;
    const line5 = coords?.lat && coords?.lng
      ? `🛰️ พิกัด GPS: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)} ${coords.accuracy ? `(±${coords.accuracy}ม.)` : ""}`
      : "";

    ctx.font = `bold ${fontSizeTitle}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    const w1 = ctx.measureText(line1).width;
    ctx.font = `600 ${fontSizeBody}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    const w2 = ctx.measureText(line2).width;
    const w3 = ctx.measureText(line3).width;
    const w4 = ctx.measureText(line4).width;
    const w5 = line5 ? ctx.measureText(line5).width : 0;
    const maxTextWidth = Math.max(w1, w2, w3, w4, w5);

    const boxWidth = maxTextWidth + padX * 2 + Math.round(16 * scale);
    const linesCount = line5 ? 5 : 4;
    const boxHeight = padY * 2 + (linesCount - 1) * lineGap + fontSizeTitle;
    const margin = Math.round(20 * scale);
    const boxX = margin;
    const boxY = targetH - boxHeight - margin;

    ctx.save();
    ctx.fillStyle = "rgba(7, 23, 43, 0.84)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = Math.max(1, Math.round(1.5 * scale));

    const radius = Math.round(10 * scale);
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, radius);
    ctx.fill();
    ctx.stroke();

    let currentY = boxY + padY + fontSizeTitle - 2;

    ctx.fillStyle = "#10b981";
    ctx.font = `bold ${fontSizeTitle}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText(`✓ ${line1}`, boxX + padX, currentY);

    currentY += lineGap;
    ctx.fillStyle = "#ffffff";
    ctx.font = `600 ${fontSizeBody}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText(line2, boxX + padX, currentY);

    currentY += lineGap;
    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    ctx.font = `400 ${fontSizeBody}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText(line3, boxX + padX, currentY);

    currentY += lineGap;
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.fillText(line4, boxX + padX, currentY);

    if (line5) {
      currentY += lineGap;
      ctx.fillStyle = "#38bdf8";
      ctx.font = `500 ${fontSizeBody}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillText(line5, boxX + padX, currentY);
    }

    ctx.restore();

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("แปลงไฟล์รูปภาพไม่สำเร็จ"));
        },
        "image/jpeg",
        0.88
      );
    });
  };

  // ถ่ายภาพจาก Live Video
  const handleCaptureFromVideo = async () => {
    const video = videoRef.current;
    if (!video || !isCameraActive) return;
    setIsProcessing(true);
    setErrorMsg("");

    try {
      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 960;
      if (w === 0 || h === 0) {
        throw new Error("ยังไม่ได้รับภาพจากกล้อง กรุณารอสักครู่แล้วลองใหม่");
      }

      const watermarkedBlob = await stampWatermark(video, w, h);
      stopCamera();

      setCapturedBlob(watermarkedBlob);
      const url = URL.createObjectURL(watermarkedBlob);
      setPreviewUrl(url);
    } catch (err: any) {
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการถ่ายภาพ");
    } finally {
      setIsProcessing(false);
    }
  };

  // ถ่ายภาพผ่าน Native Camera Input หรือเลือกรูป
  const handleNativeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setErrorMsg("");

    try {
      const bmp = await createImageBitmap(file);
      const watermarkedBlob = await stampWatermark(bmp, bmp.width, bmp.height);
      bmp.close?.();

      stopCamera();
      setCapturedBlob(watermarkedBlob);
      const url = URL.createObjectURL(watermarkedBlob);
      setPreviewUrl(url);
    } catch (err: any) {
      setErrorMsg("ไม่สามารถประมวลผลรูปภาพได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsProcessing(false);
      if (nativeCameraInputRef.current) nativeCameraInputRef.current.value = "";
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  };

  // ถ่ายใหม่
  const handleRetake = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setCapturedBlob(null);
    setPreviewUrl(null);
    setErrorMsg("");
    startCamera();
  };

  // บันทึกและอัปโหลด
  const handleConfirmAndUpload = async () => {
    if (!capturedBlob) return;
    setIsProcessing(true);
    setErrorMsg("");

    try {
      const formData = new FormData();
      const file = new File([capturedBlob], `selfie-${Date.now()}.jpg`, { type: "image/jpeg" });
      formData.append("photo", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("อัปโหลดรูปภาพไม่สำเร็จ");
      }

      const data = await res.json();
      if (!data.url) {
        throw new Error("ไม่ได้รับ URL รูปภาพจากเซิร์ฟเวอร์");
      }

      await onSaveSelfie(data.url);
      handleClose();
    } catch (err: any) {
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการบันทึกรูปภาพ");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setCapturedBlob(null);
    setPreviewUrl(null);
    setErrorMsg("");
    setCameraError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md grid place-items-center p-3 sm:p-4 animate-in fade-in duration-150 no-print"
    >
      <div className="card max-w-lg w-full bg-card shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border-line">
        {/* Input 1: ถ่ายด้วยแอปกล้องมือถือโดยตรง (Native OS Camera) */}
        <input
          ref={nativeCameraInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={handleNativeFile}
        />

        {/* Input 2: เลือกรูปจากอัลบั้ม (Gallery Fallback) */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleNativeFile}
        />

        {/* Modal Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-[#1e5c9b] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 grid place-items-center shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-base">ถ่ายภาพ Selfie คู่หน้าไซต์งาน</h3>
                <span className="chip bg-white/25 text-white border border-white/30 text-[10px] font-bold">
                  บังคับ (Mandatory)
                </span>
              </div>
              <p className="text-[11px] text-white/85">
                {storeName ? `${storeName} (${storeCode || "-"})` : "ยืนยันการเข้าพื้นที่จริงของวิศวกรผู้ตรวจ"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 text-white grid place-items-center text-sm font-bold transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* กล่องแสดงกล้องหรือพรีวิว */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-[4/3] flex items-center justify-center border-2 border-line/60">
            {previewUrl ? (
              // แสดงภาพพรีวิวพร้อมลายน้ำที่ถ่ายได้แล้ว
              <div className="relative w-full h-full">
                <img
                  src={previewUrl}
                  alt="Selfie Preview"
                  className="w-full h-full object-contain bg-black"
                />
                <div className="absolute top-3 left-3">
                  <span className="chip bg-emerald-500/90 text-white font-bold text-[11px] shadow-md backdrop-blur-sm flex items-center gap-1.5 py-1 px-2.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>ประทับลายน้ำสำเร็จ</span>
                  </span>
                </div>
              </div>
            ) : (
              // กล้องวิดีโอสด (มีแท็ก <video> อยู่ใน DOM เสมอ ป้องกันปัญหาจอดำ)
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className={`w-full h-full object-cover ${
                    facingMode === "user" ? "-scale-x-100" : ""
                  } ${isCameraActive ? "opacity-100" : "opacity-0"}`}
                />

                {/* เมื่อกล้องยังไม่ทำงานหรือพบปัญหา ให้แสดงหน้าช่วยเหลือ */}
                {!isCameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white/80 space-y-3 bg-slate-950/90 z-10">
                    <Camera className="w-12 h-12 text-emerald-400/80 animate-pulse" />
                    <div className="text-xs max-w-xs space-y-1">
                      {cameraError ? (
                        <>
                          <div className="text-rose-400 font-semibold">{cameraError}</div>
                          <div className="text-white/60 text-[11px]">
                            กดปุ่มด้านล่างเพื่อเปิดแอปกล้องของมือถือถ่ายรูปได้ทันที
                          </div>
                        </>
                      ) : (
                        <div>กำลังเชื่อมต่อกล้องถ่ายภาพ...</div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => nativeCameraInputRef.current?.click()}
                      className="btn-primary text-xs py-2.5 px-4 inline-flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                      <Camera className="w-4 h-4" />
                      <span>📸 เปิดกล้องมือถือถ่ายภาพ</span>
                    </button>
                  </div>
                )}

                {/* กรอบช่วยจัดตำแหน่งหน้าและไซต์งาน (เมื่อกล้องเปิดอยู่) */}
                {isCameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                    <div className="w-44 h-56 sm:w-52 sm:h-64 rounded-full border-2 border-dashed border-emerald-400/80 shadow-lg shadow-black/40 flex items-center justify-center">
                      <span className="text-[11px] text-white/90 bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm font-semibold text-center">
                        หันหน้า & ฉากหลังไซต์งาน
                      </span>
                    </div>
                  </div>
                )}

                {/* ปุ่มสลับกล้องหน้า/หลัง */}
                {isCameraActive && (
                  <button
                    type="button"
                    onClick={toggleFacingMode}
                    title="สลับกล้องหน้า/กล้องหลัง"
                    className="absolute top-3 right-3 p-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md z-20"
                  >
                    <SwitchCamera className="w-4 h-4 text-emerald-400" />
                    <span className="text-[11px]">{facingMode === "user" ? "กล้องหน้า" : "กล้องหลัง"}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ข้อมูลที่จะถูกประทับเป็นลายน้ำ */}
          <div className="p-3 rounded-xl bg-sunken border border-line/60 text-xs space-y-1.5">
            <div className="font-bold text-ink flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>ข้อมูลที่จะฝังลงบนภาพอัตโนมัติ:</span>
              </span>
              <span className="text-[10.5px] text-emerald-600 font-semibold">ระบบป้องกันการปลอมแปลง</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-ink2 text-[11px] pt-1">
              <div>• <strong>วิศวกร (PM):</strong> {pmName || "วิศวกรผู้ตรวจ Big-C"}</div>
              <div>• <strong>โครงการ:</strong> {storeName || "ไซต์งาน"}</div>
              <div>• <strong>เวลาถ่าย:</strong> เวลาจริงขณะกดถ่าย</div>
              <div>
                • <strong>GPS:</strong>{" "}
                {coords?.lat && coords?.lng ? (
                  <span className="text-brand font-semibold">
                    {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                  </span>
                ) : (
                  <span className="text-amber-600">จะอ่านจากพิกัดเครื่อง</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-sunken/80 border-t border-line/80 flex items-center justify-between gap-3">
          {previewUrl ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                disabled={isProcessing}
                className="px-4 py-2.5 rounded-xl border border-line hover:bg-card text-ink text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" />
                <span>ถ่ายใหม่</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmAndUpload}
                disabled={isProcessing}
                className="btn-primary flex-1 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand/20"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>กำลังบันทึกรูปภาพ…</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ยืนยันและบันทึก Selfie หน้างาน</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="px-3 py-2.5 rounded-xl border border-line hover:bg-card text-ink text-xs font-semibold transition-colors flex items-center gap-1.5"
                  title="เปิดแอปกล้องของโทรศัพท์โดยตรง"
                >
                  <Camera className="w-4 h-4 text-emerald-600" />
                  <span className="hidden sm:inline">กล้องมือถือ</span>
                </button>

                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="px-3 py-2.5 rounded-xl border border-line hover:bg-card text-ink text-xs font-semibold transition-colors flex items-center gap-1.5"
                  title="เลือกรูปจากอัลบั้ม"
                >
                  <ImageIcon className="w-4 h-4 text-sky-600" />
                  <span className="hidden sm:inline">อัลบั้ม</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleCaptureFromVideo}
                disabled={!isCameraActive || isProcessing}
                className="btn-primary flex-1 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand/20 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>กำลังถ่ายภาพ…</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>กดถ่ายภาพ Selfie (Shutter)</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
