import { useCallback, useState } from 'react'
import Cropper, { Point, Area } from 'react-easy-crop'

interface PhotoUploadProps {
  onSave: (croppedImage: string) => void
  onCancel: () => void
}

export function PhotoUpload({ onSave, onCancel }: PhotoUploadProps) {
  const [imageSrc, setImageSrc] = useState<string>('')
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [error, setError] = useState<string>('')

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setError('')
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0]
        console.log('Arquivo selecionado:', file.name, file.type, file.size)

        // Verificar tipo de arquivo
        if (!file.type.startsWith('image/')) {
          setError('Por favor, selecione uma imagem válida')
          return
        }

        // Verificar tamanho (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
          setError('A imagem deve ter no máximo 5MB')
          return
        }

      // Criar uma URL temporária para a imagem
      const imageUrl = URL.createObjectURL(file)
      
      // Carregar a imagem primeiro para garantir que ela está pronta
      const img = new Image()
      img.src = imageUrl
      img.onload = () => {
        // Verificar dimensões mínimas
        if (img.width < 100 || img.height < 100) {
          setError('A imagem deve ter pelo menos 100x100 pixels')
          URL.revokeObjectURL(imageUrl)
          return
        }
        
        console.log('Imagem carregada com sucesso:', img.width, 'x', img.height)
        // Forçar re-render do cropper com nova imagem
        setImageSrc('')
        setTimeout(() => {
          setImageSrc(imageUrl)
          setCrop({ x: 0, y: 0 })
          setZoom(1)
        }, 10)
      }
        img.onerror = () => {
          console.error('Erro ao carregar imagem')
          setError('Erro ao carregar a imagem. Tente novamente.')
          URL.revokeObjectURL(imageUrl)
        }
        img.src = imageUrl
      }
    } catch (err) {
      console.error('Erro ao processar arquivo:', err)
      setError('Erro ao processar a imagem. Tente novamente.')
    }
  }

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    // Verifica se os valores realmente mudaram antes de atualizar o estado
    if (
      !croppedAreaPixels ||
      Number.isNaN(croppedAreaPixels.width) || 
      Number.isNaN(croppedAreaPixels.height) ||
      Number.isNaN(croppedAreaPixels.x) ||
      Number.isNaN(croppedAreaPixels.y)
    ) {
      return
    }

    // Usa debounce para evitar múltiplas atualizações rápidas
    const timeout = setTimeout(() => {
      setCroppedAreaPixels(prev => {
        if (
          prev?.width === croppedAreaPixels.width &&
          prev?.height === croppedAreaPixels.height &&
          prev?.x === croppedAreaPixels.x &&
          prev?.y === croppedAreaPixels.y
        ) {
          return prev
        }
        return croppedAreaPixels
      })
    }, 100)

    return () => clearTimeout(timeout)
  }, [])

  const handleSave = async () => {
    if (!croppedAreaPixels || !imageSrc) {
      setError('Por favor, selecione e ajuste a imagem primeiro')
      return
    }

    try {
      setError('')
      console.log('Iniciando processamento da imagem')
      
      // Carregar a imagem
      const image = new Image()
      image.crossOrigin = 'anonymous'
      
      await new Promise((resolve, reject) => {
        image.onload = resolve
        image.onerror = reject
        image.src = imageSrc
      })

      // Criar canvas com tamanho fixo
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        throw new Error('Contexto 2D não disponível')
      }

      // Tamanho fixo para o avatar
      const size = 400
      canvas.width = size
      canvas.height = size

      // Desenhar a imagem cortada
      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        size,
        size
      )

      // Converter para JPG com qualidade reduzida
      const croppedImage = canvas.toDataURL('image/jpeg', 0.8)
      console.log('Imagem processada com sucesso')
      
      // Limpar URL temporária
      URL.revokeObjectURL(imageSrc)
      
      // Atualizar estado local com timestamp único para forçar revalidação
      const timestamp = Date.now()
      const cachedImage = `${croppedImage}?${timestamp}`
      setImageSrc(cachedImage)
      onSave(croppedImage)
    } catch (err) {
      console.error('Erro ao processar imagem:', err)
      setError('Erro ao processar a imagem. Tente novamente.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-black/40 backdrop-blur-md border border-primary/20 rounded-lg p-6 w-full max-w-xl">
        <h3 className="text-xl font-semibold text-primary mb-4">
          Atualizar foto do perfil
        </h3>

        {error && (
          <div className="bg-red-500/20 border border-red-500/40 text-red-200 px-4 py-2 rounded-lg mb-4">
            {error}
          </div>
        )}

        {!imageSrc ? (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-primary/20 rounded-lg">
            <input
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="hidden"
              id="photo-upload"
            />
            <label
              htmlFor="photo-upload"
              className="bg-primary/20 hover:bg-primary/30 text-primary px-4 py-2 rounded-lg cursor-pointer transition-colors"
            >
              Selecionar foto
            </label>
          </div>
        ) : (
          <>
            <div className="relative w-full aspect-square mb-4 rounded-lg overflow-hidden">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={(newCrop) => {
                  if (newCrop.x !== crop.x || newCrop.y !== crop.y) {
                    setCrop(newCrop)
                  }
                }}
                onCropComplete={onCropComplete}
                onZoomChange={(newZoom) => {
                  if (newZoom !== zoom) {
                    setZoom(newZoom)
                  }
                }}
                objectFit="contain"
                cropShape="round"
                showGrid={false}
                minZoom={0.5}
                maxZoom={3}
                initialCroppedAreaPixels={{
                  width: 400,
                  height: 400,
                  x: 0,
                  y: 0
                }}
                restrictPosition={false}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  URL.revokeObjectURL(imageSrc)
                  onCancel()
                }}
                className="bg-black/40 hover:bg-black/60 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="bg-primary hover:bg-primary/90 text-black font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Salvar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
