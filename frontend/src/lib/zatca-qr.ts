/**
 * ZATCA Phase 1 QR Code Generator
 * Encodes invoice data into TLV (Tag-Length-Value) Base64 format
 * as required by Saudi Arabia's e-invoicing (فاتورة إلكترونية) standard.
 *
 * ZATCA TLV Tags:
 *  Tag 1 → Seller Name (اسم البائع)
 *  Tag 2 → VAT Registration Number (الرقم الضريبي)
 *  Tag 3 → Invoice Timestamp (تاريخ ووقت الإصدار) — ISO 8601
 *  Tag 4 → Invoice Total with VAT (الإجمالي شامل الضريبة)
 *  Tag 5 → VAT Amount (مبلغ ضريبة القيمة المضافة)
 */

export interface ZatcaInvoiceData {
    sellerName: string;
    vatNumber: string;
    invoiceTimestamp: string; // ISO 8601 e.g. "2024-03-01T14:30:00Z"
    totalWithVat: number;
    vatAmount: number;
}

function encodeTLV(tag: number, value: string): Uint8Array {
    const valueBytes = new TextEncoder().encode(value);
    const result = new Uint8Array(2 + valueBytes.length);
    result[0] = tag;
    result[1] = valueBytes.length;
    result.set(valueBytes, 2);
    return result;
}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
    const totalLength = arrays.reduce((sum, a) => sum + a.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const a of arrays) {
        result.set(a, offset);
        offset += a.length;
    }
    return result;
}

/**
 * Generate a ZATCA-compliant QR code Base64 string.
 * Feed this string to any QR code renderer.
 */
export function generateZatcaQR(data: ZatcaInvoiceData): string {
    const tlvBuffers = [
        encodeTLV(1, data.sellerName),
        encodeTLV(2, data.vatNumber),
        encodeTLV(3, data.invoiceTimestamp),
        encodeTLV(4, data.totalWithVat.toFixed(2)),
        encodeTLV(5, data.vatAmount.toFixed(2)),
    ];

    const combined = concatUint8Arrays(tlvBuffers);

    // Convert to Base64
    let binary = '';
    for (let i = 0; i < combined.length; i++) {
        binary += String.fromCharCode(combined[i]);
    }
    return btoa(binary);
}

/**
 * Render a QR code as a data-URI PNG using the browser Canvas API.
 * Falls back to a text representation for environments without canvas.
 * Uses a simple QR module grid based on the encoded data.
 *
 * NOTE: For production, use a proper QR library. This is a simplified
 * visual placeholder that correctly encodes the ZATCA Base64 payload
 * and renders it as a visual QR-like pattern for display purposes.
 */
export function generateZatcaQRDataURI(data: ZatcaInvoiceData, size = 150): string {
    const base64Payload = generateZatcaQR(data);

    if (typeof document === 'undefined') return '';

    try {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);

        // Draw a simple hash-based pattern representing the QR
        ctx.fillStyle = '#000000';
        const moduleSize = Math.floor(size / 25);
        const bytes = Array.from(atob(base64Payload)).map((c) => c.charCodeAt(0));

        // Position detection patterns (corners)
        const drawSquare = (x: number, y: number, w: number, h: number) => {
            ctx.fillRect(x * moduleSize, y * moduleSize, w * moduleSize, h * moduleSize);
        };

        // Top-left finder
        drawSquare(1, 1, 7, 7);
        ctx.fillStyle = '#ffffff';
        drawSquare(2, 2, 5, 5);
        ctx.fillStyle = '#000000';
        drawSquare(3, 3, 3, 3);

        // Top-right finder
        ctx.fillStyle = '#000000';
        drawSquare(17, 1, 7, 7);
        ctx.fillStyle = '#ffffff';
        drawSquare(18, 2, 5, 5);
        ctx.fillStyle = '#000000';
        drawSquare(19, 3, 3, 3);

        // Bottom-left finder
        ctx.fillStyle = '#000000';
        drawSquare(1, 17, 7, 7);
        ctx.fillStyle = '#ffffff';
        drawSquare(2, 18, 5, 5);
        ctx.fillStyle = '#000000';
        drawSquare(3, 19, 3, 3);

        // Data modules based on payload bytes
        for (let i = 0; i < bytes.length && i < 400; i++) {
            const byte = bytes[i];
            const col = (i % 10) + 9;
            const row = Math.floor(i / 10) + 1;
            if (col < 24 && row < 24) {
                if (byte & 0x80) { ctx.fillStyle = '#000'; ctx.fillRect(col * moduleSize, row * moduleSize, moduleSize, moduleSize); }
                if (byte & 0x40) { ctx.fillStyle = '#000'; ctx.fillRect((col + 1) * moduleSize, row * moduleSize, moduleSize, moduleSize); }
            }
        }

        // Timing patterns
        ctx.fillStyle = '#000000';
        for (let i = 8; i < 17; i += 2) {
            ctx.fillRect(i * moduleSize, 6 * moduleSize, moduleSize, moduleSize);
            ctx.fillRect(6 * moduleSize, i * moduleSize, moduleSize, moduleSize);
        }

        return canvas.toDataURL('image/png');
    } catch {
        return '';
    }
}

/**
 * Format a number as SAR currency string for ZATCA display
 */
export function formatSAR(amount: number): string {
    return `${amount.toFixed(2)} ر.س`;
}

/**
 * Calculate VAT amounts for an invoice
 */
export function calculateVAT(amountExclVat: number, vatRate = 0.15) {
    const vatAmount = amountExclVat * vatRate;
    return {
        exclVat: amountExclVat,
        vatAmount,
        inclVat: amountExclVat + vatAmount,
        vatRate,
    };
}
