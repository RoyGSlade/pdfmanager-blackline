import { describe, expect, it } from 'vitest';
import { calculateRotatedDimensions, domToPdfPoint, pdfToDomPoint } from './coordinates';

const page = { pageWidth: 612, pageHeight: 792, zoom: 1.75 };

describe('coordinate transforms', () => {
  it.each([0, 90, 180, 270])('round-trips points at %s degrees', rotation => {
    const transform = { ...page, rotation };
    const pdfPoint = { x: 123.4, y: 456.7 };
    const domPoint = pdfToDomPoint(pdfPoint.x, pdfPoint.y, transform);
    const roundTrip = domToPdfPoint(domPoint.domX, domPoint.domY, transform);

    expect(roundTrip.pdfX).toBeCloseTo(pdfPoint.x, 5);
    expect(roundTrip.pdfY).toBeCloseTo(pdfPoint.y, 5);
  });

  it('swaps page dimensions for perpendicular rotations', () => {
    expect(calculateRotatedDimensions(612, 792, 90)).toEqual({ width: 792, height: 612 });
    expect(calculateRotatedDimensions(612, 792, 180)).toEqual({ width: 612, height: 792 });
  });
});
