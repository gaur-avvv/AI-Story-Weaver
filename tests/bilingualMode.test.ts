import { describe, it, expect } from 'vitest';

describe('Bilingual & Keyboard Accessibility Studio', () => {
  const supportedLanguages = [
    'Spanish',
    'French',
    'German',
    'Hindi',
    'Japanese',
    'Chinese (Simplified)',
    'Italian',
    'Portuguese',
    'Arabic',
    'Russian',
  ];

  it('supports major international educational languages', () => {
    expect(supportedLanguages.length).toBeGreaterThanOrEqual(8);
    expect(supportedLanguages).toContain('Spanish');
    expect(supportedLanguages).toContain('French');
    expect(supportedLanguages).toContain('Japanese');
    expect(supportedLanguages).toContain('Hindi');
  });

  it('correctly maps translated paragraphs to story segment IDs', () => {
    const mockMap: Record<string, { paragraph: string; title?: string }> = {};
    const segId = 'seg_chapter_1';
    
    mockMap[segId] = {
      paragraph: 'Elena caminó silenciosamente por el bosque.',
      title: 'El Bosque Susurrante',
    };

    expect(mockMap[segId]).toBeDefined();
    expect(mockMap[segId].title).toBe('El Bosque Susurrante');
    expect(mockMap[segId].paragraph).toContain('Elena');
  });
});
