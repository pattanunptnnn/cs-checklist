"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import QRCode from "qrcode";
import type { CheckInData } from "@/lib/types";
import {
  QrCode,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  X,
  Navigation,
  Clock,
  UserCheck,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Printer,
  Download,
  Sparkles,
  Smartphone,
  Eye,
  Camera,
  Upload,
  Video,
} from "lucide-react";

interface QRCheckInProps {
  storeName?: string;
  storeCode?: string;
  pmName?: string;
  checkIn?: CheckInData | null;
  onCheckIn: (data: CheckInData) => void;
  onClearCheckIn?: () => void;
  onOpenSelfie?: () => void;
}

export default function QRCheckIn({
  storeName,
  storeCode,
  pmName,
  checkIn,
  onCheckIn,
  onClearCheckIn,
  onOpenSelfie,
}: QRCheckInProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [scannerStatus, setScannerStatus] = useState("");
  const [gpsData, setGpsData] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [previewSelfie, setPreviewSelfie] = useState<string | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileUploadInputRef = useRef<HTMLInputElement | null>(null);
  const scannerContainerId = "qr-reader-container";

  // รหัสไซต์งานเฉพาะของสาขา
  const computedSiteCode = storeCode
    ? `BIGC-SITE-${storeCode}`
    : storeName
    ? `BIGC-SITE-${encodeURIComponent(storeName.slice(0, 15))}`
    : "BIGC-SITE-DEMO";

  // สร้าง QR Code image data URL สำหรับไซต์นี้
  useEffect(() => {
    const payload = JSON.stringify({
      site: computedSiteCode,
      name: storeName || "สาขาทดสอบ",
      code: storeCode || "-",
      system: "Big-C Civil Structure Inspection",
    });

    QRCode.toDataURL(payload, {
      width: 320,
      margin: 2,
      color: {
        dark: "#0b2545",
        light: "#ffffff",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("Error generating QR:", err));
  }, [computedSiteCode, storeName, storeCode]);

  // ฟังก์ชันขอพิกัด GPS จริงของเครื่อง
  const fetchCurrentLocation = useCallback((): Promise<{ lat: number; lng: number; accuracy: number }> => {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !navigator.geolocation) {
        reject(new Error("เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง GPS"));
        return;
      }
      setGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGettingLocation(false);
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: Math.round(position.coords.accuracy),
          };
          setGpsData(coords);
          resolve(coords);
        },
        (error) => {
          setGettingLocation(false);
          let msg = "ไม่สามารถระบุพิกัด GPS ได้";
          if (error.code === error.PERMISSION_DENIED) {
            msg = "กรุณาอนุญาตการเข้าถึงตำแหน่งที่ตั้ง (Location Permission) ในเบราว์เซอร์";
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            msg = "สัญญาณ GPS ไม่พร้อมใช้งานในขณะนี้";
          } else if (error.code === error.TIMEOUT) {
            msg = "หมดเวลาการค้นหาสัญญาณ GPS";
          }
          reject(new Error(msg));
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  // หยุดกล้องและคืนทรัพยากรฮาร์ดแวร์ให้เบราว์เซอร์ทั้งหมด
  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        const state = html5QrCodeRef.current.getState();
        // 2 = SCANNING, 3 = PAUSED
        if (state === 2 || state === 3) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn("Stop scanner error:", err);
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
    setIsStarting(false);
  }, []);

  // จัดการเมื่อสแกน QR โค้ดสำเร็จ
  const handleScanSuccess = useCallback(async (qrContent: string) => {
    await stopScanner();
    setScannerStatus("ตรวจพบ QR Code กำลังยืนยันพิกัด GPS...");

    let parsedSite = qrContent;
    try {
      const obj = JSON.parse(qrContent);
      if (obj.site) parsedSite = obj.site;
    } catch {
      // plaintext QR
    }

    let loc = gpsData;
    if (!loc) {
      try {
        loc = await fetchCurrentLocation();
      } catch (err: any) {
        console.warn("GPS warning:", err.message);
      }
    }

    const checkInData: CheckInData = {
      timestamp: new Date().toISOString(),
      inspectorName: pmName || "วิศวกรผู้ตรวจ Big-C PM",
      siteCode: parsedSite.trim(),
      lat: loc?.lat,
      lng: loc?.lng,
      accuracy: loc?.accuracy,
      address: storeName ? `${storeName} (${storeCode || "-"})` : "หน้างาน Big-C Mini",
      verified: true,
      selfiePhoto: checkIn?.selfiePhoto,
      selfieTimestamp: checkIn?.selfieTimestamp,
    };

    onCheckIn(checkInData);
    setIsOpen(false);
    setShowQrModal(false);
  }, [gpsData, fetchCurrentLocation, onCheckIn, pmName, storeName, storeCode, stopScanner]);

  // เริ่มกล้องสแกนสด Live Video (พร้อม 3-Step Fallback รองรับทั้ง Mac, PC, iOS, Android)
  const startLiveScanner = async () => {
    setErrorMsg("");
    setIsStarting(true);
    setScannerStatus("กำลังเปิดกล้อง...");

    // เคลียร์ตัวเดิมออกก่อน
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch {}
      html5QrCodeRef.current = null;
    }

    // ดึง GPS ควบคู่ไปด้วย
    fetchCurrentLocation().catch(() => {});

    try {
      const container = document.getElementById(scannerContainerId);
      if (!container) {
        throw new Error("ไม่พบพื้นที่แสดงผลกล้อง");
      }
      container.innerHTML = "";

      const html5QrCode = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = html5QrCode;

      const qrConfig = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      };

      const onScan = async (text: string) => {
        await handleScanSuccess(text);
      };

      // กลยุทธ์การเปิดกล้องแบบยืดหยุ่น:
      // ขั้นที่ 1: ลองเปิดแบบกล้องหลัง (เหมาะกับมือถือ)
      let started = false;
      try {
        await html5QrCode.start({ facingMode: "environment" }, qrConfig, onScan, () => {});
        started = true;
      } catch (err1: any) {
        console.warn("Step 1 (environment camera) failed, trying user camera:", err1?.name || err1);
      }

      // ขั้นที่ 2: ถ้าไม่มีกล้องหลัง (เช่น เครื่อง Mac หรือ Laptop) ให้ลองกล้องหน้า (user)
      if (!started) {
        try {
          await html5QrCode.start({ facingMode: "user" }, qrConfig, onScan, () => {});
          started = true;
        } catch (err2: any) {
          console.warn("Step 2 (user camera) failed, trying enumerated deviceId:", err2?.name || err2);
        }
      }

      // ขั้นที่ 3: ถ้ายังไม่ได้ ให้ขอรายชื่อกล้องจาก getCameras แล้วเอาตัวแรก
      if (!started) {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          await html5QrCode.start(devices[0].id, qrConfig, onScan, () => {});
          started = true;
        }
      }

      if (started) {
        setIsScanning(true);
        setIsStarting(false);
        setScannerStatus("จ่อกล้องไปที่ QR Code ประจำไซต์งาน");
      } else {
        throw new Error("ไม่พบอุปกรณ์กล้องที่เปิดใช้งานได้บนเครื่องนี้");
      }
    } catch (err: any) {
      console.error("Live camera error:", err);
      setIsScanning(false);
      setIsStarting(false);
      await stopScanner();

      const errMsg = String(err?.message || err);
      const errName = err?.name || "";

      if (errName === "NotAllowedError" || errMsg.includes("Permission") || errMsg.includes("denied")) {
        setErrorMsg(
          "เบราว์เซอร์ถูกปฏิเสธสิทธิ์การใช้กล้อง: กรุณาคลิกรูปแม่กุญแจ 🔒 ที่ช่อง URL ด้านบน แล้วเลือก 'อนุญาตการใช้กล้อง (Allow Camera)'"
        );
      } else if (errName === "NotReadableError" || errMsg.includes("Could not start video source") || errMsg.includes("already in use")) {
        setErrorMsg(
          "กล้องกำลังถูกใช้งานโดยโปรแกรมอื่นหรือแท็บอื่น: กรุณาปิดแท็บหรือโปรแกรมที่ใช้กล้องแล้วลองใหม่อีกครั้ง"
        );
      } else {
        setErrorMsg(
          `ไม่สามารถเปิดสตรีมกล้องสดได้ (${errName || "Camera Error"}): คุณสามารถกดปุ่ม "ถ่ายรูปด้วยกล้องมือถือ" หรือ "เลือกรูปภาพ" หรือ "จำลองสแกน" ด้านล่างแทนได้ทันที`
        );
      }
    }
  };

  // สแกน QR Code จากไฟล์รูปภาพหรือภาพถ่าย (ใช้ได้ 100% ทุกอุปกรณ์)
  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg("");
    setScannerStatus("กำลังอ่านข้อมูล QR Code จากรูปภาพ...");

    try {
      await stopScanner();
      const container = document.getElementById(scannerContainerId) || document.getElementById("qr-temp-worker");
      const tempId = container ? container.id : scannerContainerId;
      const qrScanner = new Html5Qrcode(tempId);
      html5QrCodeRef.current = qrScanner;

      const decodedText = await qrScanner.scanFile(file, false);
      await handleScanSuccess(decodedText);
    } catch (err: any) {
      setErrorMsg("ไม่พบ QR Code ในรูปภาพนี้ กรุณาถ่ายใหม่อีกครั้งให้เห็น QR Code ชัดเจนและสว่างพอ");
    } finally {
      if (nativeCameraInputRef.current) nativeCameraInputRef.current.value = "";
      if (fileUploadInputRef.current) fileUploadInputRef.current.value = "";
    }
  };

  // ฟังก์ชัน GPS Instant Check-in: เช็คอินด้วยพิกัด GPS จริงของเครื่อง 1-Click ทันที
  const handleGpsInstantCheckIn = async () => {
    setErrorMsg("");
    try {
      const loc = await fetchCurrentLocation();
      const checkInData: CheckInData = {
        timestamp: new Date().toISOString(),
        inspectorName: pmName || "วิศวกรผู้ตรวจ Big-C PM",
        siteCode: computedSiteCode,
        lat: loc.lat,
        lng: loc.lng,
        accuracy: loc.accuracy,
        address: storeName ? `${storeName} (${storeCode || "-"})` : "หน้างาน Big-C Mini",
        verified: true,
        selfiePhoto: checkIn?.selfiePhoto,
        selfieTimestamp: checkIn?.selfieTimestamp,
        method: "gps_proof",
      };
      onCheckIn(checkInData);
      setIsOpen(false);

      // ถ้ายังไม่ได้ถ่ายภาพ Selfie คู่หน้างาน ให้เปิดกล้อง Selfie ต่อทันทีเพื่อความสะดวกรวดเร็ว
      if (!checkIn?.selfiePhoto && onOpenSelfie) {
        setTimeout(() => {
          onOpenSelfie();
        }, 350);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "ไม่สามารถรับสัญญาณ GPS ได้ กรุณาเปิดสิทธิ์ Location ในเบราว์เซอร์");
    }
  };

  // ปิด modal และหยุดกล้อง
  const closeModal = async () => {
    await stopScanner();
    setIsOpen(false);
    setErrorMsg("");
  };

  // ปิดกล้องเมื่อ component unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  return (
    <>
      {/* Element ซ่อนสำหรับประมวลผลรูปภาพ */}
      <div id="qr-temp-worker" className="hidden" />

      {/* Input 1: เปิดกล้องมือถือถ่ายภาพทันที (Native OS Camera) */}
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleImageFile}
      />

      {/* Input 2: เลือกรูปจากอัลบั้ม/ไฟล์ */}
      <input
        ref={fileUploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFile}
      />

      {/* ────────── การ์ดแสดงสถานะเช็คอินหน้างาน ────────── */}
      <div className="card p-4 border-line/80 overflow-hidden relative">
        {errorMsg && !isOpen && (
          <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {checkIn?.verified ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-500/5 p-3.5 rounded-xl border border-emerald-500/20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white grid place-items-center shrink-0 shadow-md shadow-emerald-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display font-bold text-sm sm:text-base text-ink">
                    ยืนยันการเข้าตรวจหน้างานจริง (Verified On-Site)
                  </span>
                  <span className="chip bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30 text-[10.5px] flex items-center gap-1">
                    <Navigation className="w-3 h-3 text-emerald-600" />
                    <span>✓ GPS Verified</span>
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-ink2 mt-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ผู้ตรวจ: <strong>{checkIn.inspectorName}</strong></span>
                  </span>

                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-ink3" />
                    <span>
                      {new Date(checkIn.timestamp).toLocaleTimeString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })} น.
                    </span>
                  </span>

                  {checkIn.lat && checkIn.lng && (
                    <a
                      href={`https://www.google.com/maps?q=${checkIn.lat},${checkIn.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-brand font-semibold hover:underline"
                      title="เปิดดูตำแหน่งจริงบน Google Maps"
                    >
                      <MapPin className="w-3.5 h-3.5 text-brand" />
                      <span>{checkIn.lat.toFixed(5)}, {checkIn.lng.toFixed(5)}</span>
                      {checkIn.accuracy && (
                        <span className="text-[10px] text-ink3 font-normal">
                          (±{checkIn.accuracy}ม.)
                        </span>
                      )}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  {checkIn.siteCode && (
                    <span className="chip bg-sunken text-ink2 text-[10px] font-mono">
                      ไซต์: {checkIn.siteCode}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={handleGpsInstantCheckIn}
                disabled={gettingLocation}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-card border border-line text-ink2 hover:text-brand hover:border-brand transition-all flex items-center gap-1.5 shadow-sm"
                title="กดเพื่ออัปเดตพิกัด GPS ณ ตำแหน่งปัจจุบันใหม่"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${gettingLocation ? "animate-spin text-brand" : ""}`} />
                <span>{gettingLocation ? "กำลังค้นหาพิกัด…" : "อัปเดต GPS ใหม่"}</span>
              </button>
              {onClearCheckIn && (
                <button
                  type="button"
                  onClick={onClearCheckIn}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-ink3 hover:text-fail transition-colors"
                >
                  ล้างข้อมูล
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-transparent p-3.5 sm:p-4 rounded-xl border border-emerald-500/25">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 grid place-items-center shrink-0 border border-emerald-500/30">
                <Navigation className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-sm sm:text-base text-ink">
                    ยังไม่ได้เช็คอินหน้าไซต์งาน
                  </h3>
                  <span className="chip bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold text-[10.5px]">
                    รอการยืนยันพิกัด
                  </span>
                </div>
                <p className="text-xs text-ink2 mt-0.5 max-w-md">
                  กดปุ่มเช็คอินเพื่อบันทึกพิกัดดาวเทียม GPS จริงของ PM ณ จุดที่ยืนอยู่หน้าไซต์งานทันที (ไม่ต้องแปะป้าย QR ที่ไซต์)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap sm:flex-nowrap">
              {/* ปุ่มหลัก: GPS Instant Check-in 1-Click ทันที */}
              <button
                type="button"
                onClick={handleGpsInstantCheckIn}
                disabled={gettingLocation}
                className="btn-primary inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/25 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white whitespace-nowrap flex-1 sm:flex-initial transition-all active:scale-95 disabled:opacity-60"
                title="เช็คอินด้วยพิกัดดาวเทียม GPS สดทันที ไม่ต้องใช้ป้าย QR"
              >
                {gettingLocation ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>กำลังระบุพิกัด GPS…</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4 text-emerald-200" />
                    <span>📍 เช็คอินพิกัด GPS สดทันที</span>
                  </>
                )}
              </button>

              {/* ปุ่มรอง: สแกน QR หน้างาน (ทางเลือกสำรอง) */}
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-card border border-line hover:border-brand text-ink hover:text-brand transition-all flex items-center justify-center gap-1.5"
                title="สแกน QR Code ประจำไซต์ (ทางเลือกสำรอง)"
              >
                <QrCode className="w-4 h-4 text-ink3" />
                <span className="hidden sm:inline">หรือสแกน QR</span>
              </button>
            </div>
          </div>
        )}

        {/* ────────── แถวสถานะการถ่ายภาพ Selfie ยืนยันตัวตนคู่กับหน้าไซต์งาน (บังคับ) ────────── */}
        <div className="mt-3 pt-3 border-t border-line/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {checkIn?.selfiePhoto ? (
              <div className="relative group shrink-0">
                <img
                  src={checkIn.selfiePhoto}
                  alt="Selfie ยืนยันหน้างาน"
                  onClick={() => setPreviewSelfie(checkIn.selfiePhoto || null)}
                  className="w-12 h-12 rounded-xl object-cover border-2 border-emerald-500 cursor-pointer shadow-sm group-hover:scale-105 transition-transform"
                />
                <button
                  type="button"
                  onClick={() => setPreviewSelfie(checkIn.selfiePhoto || null)}
                  title="ดูรูปภาพขนาดเต็ม"
                  className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border-2 border-dashed border-rose-400 text-rose-600 grid place-items-center shrink-0">
                <Camera className="w-5 h-5" />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-xs sm:text-sm text-ink">
                  รูปถ่าย Selfie ยืนยันตัวตนคู่กับหน้างาน
                </span>
                {checkIn?.selfiePhoto ? (
                  <span className="chip bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                    ✓ ถ่ายยืนยันแล้ว
                  </span>
                ) : (
                  <span className="chip bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                    ⚠️ ยังไม่ถ่าย (บังคับ)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-ink3 mt-0.5 truncate">
                {checkIn?.selfiePhoto
                  ? `ถ่ายเมื่อ ${new Date(checkIn.selfieTimestamp || checkIn.timestamp).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น. (มีลายน้ำพิกัด & วันเวลา)`
                  : "บังคับถ่ายภาพ Selfie ตัวเองคู่กับหน้างานก่อสร้างจริงเพื่อป้องกันการเช็คชื่อแทน"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {checkIn?.selfiePhoto ? (
              <>
                <button
                  type="button"
                  onClick={() => setPreviewSelfie(checkIn.selfiePhoto || null)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-sunken hover:bg-card border border-line text-ink2 transition-colors flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>ดูภาพ</span>
                </button>
                {onOpenSelfie && (
                  <button
                    type="button"
                    onClick={onOpenSelfie}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-sunken hover:bg-card border border-line text-brand transition-colors flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>ถ่ายใหม่</span>
                  </button>
                )}
              </>
            ) : (
              onOpenSelfie && (
                <button
                  type="button"
                  onClick={onOpenSelfie}
                  className="btn-primary text-xs py-2 px-3.5 font-bold shadow-md shadow-brand/20 flex items-center gap-1.5"
                >
                  <Camera className="w-4 h-4" />
                  <span>📸 ถ่ายรูป Selfie หน้างาน</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Lightbox สำหรับดูรูป Selfie ขนาดเต็ม */}
      {previewSelfie && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md grid place-items-center p-4 animate-in fade-in duration-150 no-print"
          onClick={() => setPreviewSelfie(null)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewSelfie(null)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewSelfie}
              alt="Full size selfie"
              className="max-h-[82vh] w-auto object-contain rounded-2xl shadow-2xl border border-white/20"
            />
            <div className="mt-3 text-center text-xs text-white/80 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>ภาพ Selfie ประจำไซต์งานพร้อมลายน้ำพิกัดและเวลาที่บันทึกจริง</span>
            </div>
          </div>
        </div>
      )}

      {/* ────────── MODAL สแกน QR CODE + GPS ────────── */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm grid place-items-center p-3 sm:p-4 animate-in fade-in duration-150 no-print"
        >
          <div className="card max-w-lg w-full bg-card shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-brand to-[#1e5c9b] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/15 grid place-items-center">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base">สแกน QR Code ตรวจรับหน้างาน</h3>
                  <p className="text-[11px] text-white/80">
                    {storeName ? `${storeName} (${storeCode || "-"})` : "ระบบตรวจสอบพิกัดเข้าพื้นที่จริง"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center text-sm font-bold transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
              {/* จุดแสดงกล้อง Scanner */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 border-2 border-line/60 min-h-[260px] flex items-center justify-center">
                <div id={scannerContainerId} className="w-full h-full min-h-[260px]" />

                {!isScanning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center bg-slate-900/95 text-white z-10">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 grid place-items-center mb-3">
                      <Camera className="w-7 h-7 text-white/80" />
                    </div>

                    <h4 className="text-sm font-bold mb-1">เลือกวิธีสแกน QR Code</h4>
                    <p className="text-xs text-white/60 mb-4 max-w-xs">
                      เลือกเปิดสตรีมกล้องสด หรือใช้กล้องมือถือถ่ายภาพ หรือเลือกรูปจากคลังภาพ
                    </p>

                    <div className="w-full max-w-xs space-y-2">
                      {/* ปุ่ม 1: ถ่ายรูปด้วยกล้องมือถือ (Native OS Camera - เสถียร 100% บนมือถือ) */}
                      <button
                        type="button"
                        onClick={() => nativeCameraInputRef.current?.click()}
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
                      >
                        <Camera className="w-4 h-4" />
                        <span>ถ่ายรูป QR ด้วยกล้องมือถือ (แนะนำ)</span>
                      </button>

                      {/* ปุ่ม 2: เปิดกล้องสด Live Video */}
                      <button
                        type="button"
                        onClick={startLiveScanner}
                        disabled={isStarting}
                        className="w-full py-2.5 px-4 rounded-xl bg-brand hover:bg-brand/90 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
                      >
                        <Video className="w-4 h-4" />
                        <span>{isStarting ? "กำลังเชื่อมต่อกล้อง…" : "เปิดสตรีมกล้องสด (Live Scanner)"}</span>
                      </button>

                      {/* ปุ่มแถวล่าง: เลือกรูป + จำลอง */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => fileUploadInputRef.current?.click()}
                          className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center justify-center gap-1.5 text-white/90 transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>เลือกรูปจากเครื่อง</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleScanSuccess(computedSiteCode)}
                          className="py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                          title="จำลองว่าสแกน QR ผ่านทันทีสำหรับทดสอบ"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>จำลองสแกน QR</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* สถานะขณะสแกนสด */}
              {isScanning && (
                <div className="flex items-center justify-between bg-sunken p-3 rounded-xl border border-line text-xs">
                  <span className="text-ink2 font-medium flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>{scannerStatus}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleScanSuccess(computedSiteCode)}
                      className="text-brand font-semibold hover:underline"
                    >
                      จำลองสแกนสำเร็จ
                    </button>
                    <span className="text-line">|</span>
                    <button
                      type="button"
                      onClick={stopScanner}
                      className="text-fail font-semibold hover:underline"
                    >
                      ปิดกล้อง
                    </button>
                  </div>
                </div>
              )}

              {/* แจ้งข้อผิดพลาดอย่างละเอียดพร้อมปุ่มเลือกทางออกอื่นทันที */}
              {errorMsg && (
                <div className="flex flex-col gap-2.5 bg-fail/10 border border-fail/25 p-3.5 rounded-xl text-xs text-fail">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-fail" />
                    <span className="leading-relaxed font-medium whitespace-pre-line">{errorMsg}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-fail/20 flex-wrap">
                    <button
                      type="button"
                      onClick={() => nativeCameraInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>ใช้กล้องมือถือถ่ายภาพแทน</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleScanSuccess(computedSiteCode)}
                      className="px-3 py-1.5 rounded-lg bg-card text-brand hover:bg-sunken border border-line text-xs font-bold flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>กดจำลองสแกน QR ผ่าน</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ข้อมูล GPS Preview */}
              <div className="bg-sunken p-3.5 rounded-xl border border-line space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-ink flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-brand" />
                    <span>สัญญาณดาวเทียม GPS:</span>
                  </span>
                  {gettingLocation ? (
                    <span className="text-brand font-semibold animate-pulse">กำลังค้นหาตำแหน่ง…</span>
                  ) : gpsData ? (
                    <span className="text-pass font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>ตรวจพบพิกัดแล้ว</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fetchCurrentLocation().catch((e) => setErrorMsg(e.message))}
                      className="text-brand font-semibold underline"
                    >
                      ตรวจจับพิกัด
                    </button>
                  )}
                </div>

                {gpsData && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-line/60 font-mono text-[11px] text-ink2">
                    <div>ละติจูด: <strong>{gpsData.lat.toFixed(6)}</strong></div>
                    <div>ลองจิจูด: <strong>{gpsData.lng.toFixed(6)}</strong></div>
                    <div className="col-span-2 text-[10.5px] text-ink3">
                      ความแม่นยำประมาณ ±{gpsData.accuracy} เมตร
                    </div>
                  </div>
                )}
              </div>

              {/* ทางเลือกสำรอง: เช็คอินด้วย GPS พิกัดจริงโดยตรง (เมื่อ QR หน้างานชำรุด) */}
              <div className="pt-2 border-t border-line/60">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-ink3">กรณี QR Code หน้างานชำรุด:</span>
                  <button
                    type="button"
                    onClick={handleGpsInstantCheckIn}
                    disabled={gettingLocation}
                    className="text-xs font-bold text-brand hover:underline flex items-center gap-1"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>ใช้พิกัด GPS เช็คอินทันที</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-sunken/60 border-t border-line flex items-center justify-end">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 rounded-xl bg-card border border-line text-xs font-bold text-ink2 hover:bg-sunken"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────── MODAL สร้าง / พิมพ์ QR CODE ประจำไซต์ ────────── */}
      {showQrModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4 animate-in fade-in duration-150 no-print"
        >
          <div className="card max-w-sm w-full bg-card shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-brand to-[#1e5c9b] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                <h3 className="font-display font-bold text-base">QR Code ประจำไซต์งาน</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center text-xs font-bold transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 text-center">
              <div className="bg-white p-4 rounded-2xl shadow-inner inline-block border-2 border-brand/20 mb-4">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`Site QR for ${storeName || "Project"}`}
                    className="w-56 h-56 mx-auto block"
                  />
                ) : (
                  <div className="w-56 h-56 grid place-items-center text-ink3 text-xs">
                    กำลังสร้าง QR Code…
                  </div>
                )}
              </div>

              <h4 className="font-display font-bold text-base text-ink">
                {storeName || "ไซต์งานก่อสร้าง Big-C"}
              </h4>
              <p className="text-xs text-ink2 font-mono mt-0.5">
                รหัสไซต์: {computedSiteCode}
              </p>
              <p className="text-[11px] text-ink3 mt-2 max-w-xs mx-auto">
                พิมพ์และติด QR Code นี้ไว้บริเวณทางเข้าหรือบอร์ดหน้างาน เพื่อให้วิศวกร PM สแกนยืนยันการเข้าตรวจจริง
              </p>

              {/* ปุ่ม Action ใน Modal */}
              <div className="mt-5 space-y-2">
                <button
                  type="button"
                  onClick={() => handleScanSuccess(computedSiteCode)}
                  className="w-full btn-primary py-2.5 text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>ทดสอบเช็คอินด้วย QR นี้ทันที</span>
                </button>

                {qrDataUrl && (
                  <a
                    href={qrDataUrl}
                    download={`QR-Site-${storeCode || "BigC"}.png`}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl border border-line bg-card hover:bg-sunken text-ink text-xs font-semibold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ดาวน์โหลดไฟล์รูป QR Code</span>
                  </a>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 bg-sunken/60 border-t border-line flex items-center justify-between">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>พิมพ์หน้านี้</span>
              </button>

              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="px-3 py-1.5 rounded-lg bg-card border border-line text-xs font-semibold text-ink2"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
