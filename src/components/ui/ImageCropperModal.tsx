'use client'

import React, { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check } from 'lucide-react'
import { NeonButton } from './NeonButton'

interface ImageCropperModalProps {
    image: string
    onCropComplete: (croppedImage: Blob) => void
    onClose: () => void
}

export const ImageCropperModal = ({ image, onCropComplete, onClose }: ImageCropperModalProps) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)

    const onCropChange = (crop: any) => setCrop(crop)
    const onZoomChange = (zoom: any) => setZoom(zoom)

    const onCropCompleteInternal = useCallback((_: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }, [])

    const createImage = (url: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
            const image = new Image()
            image.addEventListener('load', () => resolve(image))
            image.addEventListener('error', (error) => reject(error))
            image.setAttribute('crossOrigin', 'anonymous')
            image.src = url
        })

    const getCroppedImg = async () => {
        try {
            const img = await createImage(image)
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')

            if (!ctx) return

            canvas.width = croppedAreaPixels.width
            canvas.height = croppedAreaPixels.height

            ctx.drawImage(
                img,
                croppedAreaPixels.x,
                croppedAreaPixels.y,
                croppedAreaPixels.width,
                croppedAreaPixels.height,
                0,
                0,
                croppedAreaPixels.width,
                croppedAreaPixels.height
            )

            return new Promise<Blob>((resolve) => {
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob)
                }, 'image/jpeg')
            })
        } catch (e) {
            console.error(e)
        }
    }

    const handleConfirm = async () => {
        const croppedBlob = await getCroppedImg()
        if (croppedBlob) {
            onCropComplete(croppedBlob)
        }
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative w-full max-w-lg bg-deep-space border border-white/10 rounded-3xl overflow-hidden"
                >
                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                        <h3 className="text-white font-bold">Ajustar Imagem</h3>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="relative h-80 bg-black">
                        <Cropper
                            image={image}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            onCropChange={onCropChange}
                            onCropComplete={onCropCompleteInternal}
                            onZoomChange={onZoomChange}
                        />
                    </div>

                    <div className="p-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Zoom</label>
                            <input
                                type="range"
                                value={zoom}
                                min={1}
                                max={3}
                                step={0.1}
                                aria-labelledby="Zoom"
                                onChange={(e: any) => setZoom(e.target.value)}
                                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-neon-purple"
                            />
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="flex-1 py-3 rounded-xl bg-neon-purple text-white font-bold shadow-[0_0_20px_rgba(168,85,247,0.4)] flex items-center justify-center space-x-2"
                            >
                                <Check size={18} />
                                <span>Confirmar</span>
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
