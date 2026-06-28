export function onlyDigits(value?: string | null) {
    return (value || '').replace(/\D/g, '')
}

export function buildPhoneWithCountryCode(countryPrefix: string, phone: string) {
    const prefixDigits = onlyDigits(countryPrefix)
    let phoneDigits = onlyDigits(phone)

    if (phoneDigits.startsWith(prefixDigits)) {
        phoneDigits = phoneDigits.slice(prefixDigits.length)
    }

    return `${countryPrefix}${phoneDigits}`
}

function brazilLocalDigits(value?: string | null) {
    const digits = onlyDigits(value)

    if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
        return digits.slice(2)
    }

    return digits
}

function brazilWithoutNinthDigit(value?: string | null) {
    const local = brazilLocalDigits(value)

    if (local.length === 11 && local[2] === '9') {
        return `${local.slice(0, 2)}${local.slice(3)}`
    }

    return local
}

export function phoneMatches(savedPhone?: string | null, inputPhone?: string | null) {
    const savedDigits = onlyDigits(savedPhone)
    const inputDigits = onlyDigits(inputPhone)

    if (!savedDigits || !inputDigits) return false

    return savedDigits === inputDigits
        || savedDigits.slice(-11) === inputDigits.slice(-11)
        || brazilLocalDigits(savedPhone) === brazilLocalDigits(inputPhone)
        || brazilWithoutNinthDigit(savedPhone) === brazilWithoutNinthDigit(inputPhone)
}
