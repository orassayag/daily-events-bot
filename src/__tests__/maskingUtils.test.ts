import { describe, it, expect } from 'vitest';
import { maskCreditCards } from '../utils/maskingUtils.js';

describe('maskingUtils', () => {
  describe('maskCreditCards', () => {
    it('should mask credit card numbers with hyphens', () => {
      const input =
        '-BuyMe All - מגוון אדיר במתנה אחת. יתרה: 100 ש"ח. קוד: 1111-1111-1111-1111. תוקף: 20/02/2031.';
      const expected =
        '-BuyMe All - מגוון אדיר במתנה אחת. יתרה: 100 ש"ח. קוד: ****-****-****-1111. תוקף: 20/02/2031.';
      expect(maskCreditCards(input)).toBe(expected);
    });

    it('should mask multiple credit card numbers in the same text', () => {
      const input = 'Card 1: 1111-1111-1111-1111, Card 2: 1111-1111-1111-2222';
      const expected =
        'Card 1: ****-****-****-1111, Card 2: ****-****-****-2222';
      expect(maskCreditCards(input)).toBe(expected);
    });

    it('should mask credit cards with spaces', () => {
      const input = 'My card is 1111 1111 1111-1111';
      const expected = 'My card is ****-****-****-1111';
      expect(maskCreditCards(input)).toBe(expected);
    });

    it('should not mask numbers that do not match the pattern', () => {
      const input = 'Phone: 050-1234567, Date: 20-02-2031, Small: 1234-5678';
      expect(maskCreditCards(input)).toBe(input);
    });

    it('should handle empty string', () => {
      expect(maskCreditCards('')).toBe('');
    });
  });
});
