import { create } from 'zustand'

export type CouponType = 'PERCENTAGE' | 'FIXED' | 'DOUBLE_CREDITS' | 'FREE_FIRST'

interface Coupon {
  id: string
  code: string
  type: CouponType
  discount?: number
  maxUses?: number
  usageCount: number
  isActive: boolean
  createdAt: Date
  expiresAt?: Date
}

interface CouponsStore {
  coupons: Coupon[]
  isModalOpen: boolean
  setIsModalOpen: (isOpen: boolean) => void
  addCoupon: (coupon: Omit<Coupon, 'id' | 'usageCount' | 'createdAt'>) => void
  toggleCouponStatus: (id: string) => void
}

export const useCouponsStore = create<CouponsStore>((set) => ({
  coupons: [
    {
      id: '1',
      code: 'BEMVINDO10',
      type: 'PERCENTAGE',
      discount: 10,
      usageCount: 5,
      isActive: true,
      createdAt: new Date('2024-01-01'),
      expiresAt: new Date('2024-12-31'),
    },
  ],
  isModalOpen: false,
  setIsModalOpen: (isOpen) => set({ isModalOpen: isOpen }),
  addCoupon: (coupon) =>
    set((state) => ({
      coupons: [
        ...state.coupons,
        {
          ...coupon,
          id: Math.random().toString(36).substr(2, 9),
          usageCount: 0,
          createdAt: new Date(),
        },
      ],
    })),
  toggleCouponStatus: (id) =>
    set((state) => ({
      coupons: state.coupons.map((coupon) =>
        coupon.id === id
          ? { ...coupon, isActive: !coupon.isActive }
          : coupon
      ),
    })),
}))
