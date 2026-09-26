import { describe, it, expect } from 'vitest';
import { extractJson } from '../services/geminiService';

describe('extractJson - Resilient AI Output Parser', () => {
  it('parses raw valid JSON objects', () => {
    const raw = '{"chapterTitle": "The Awakening", "choices": ["Enter cave", "Turn back"]}';
    const result = extractJson(raw);
    expect(result.chapterTitle).toBe('The Awakening');
    expect(result.choices.length).toBe(2);
  });

  it('strips markdown code fences (```json ... ```)', () => {
    const raw = '```json\n{"paragraph": "The fog began to lift.", "sentiment": "calm"}\n```';
    const result = extractJson(raw);
    expect(result.paragraph).toBe('The fog began to lift.');
    expect(result.sentiment).toBe('calm');
  });

  it('strips DeepSeek / Qwen reasoning <think>...</think> tags', () => {
    const raw = '<think>I should generate a tense opening scene.</think>\n{"paragraph": "Thunder cracked overhead.", "tension": "high"}';
    const result = extractJson(raw);
    expect(result.paragraph).toBe('Thunder cracked overhead.');
    expect(result.tension).toBe('high');
  });

  it('extracts JSON objects surrounded by conversational LLM preamble and postamble', () => {
    const raw = 'Sure! Here is the JSON output you requested:\n{"title": "Quest of Kings", "ready": true}\nHope this helps!';
    const result = extractJson(raw);
    expect(result.title).toBe('Quest of Kings');
    expect(result.ready).toBe(true);
  });

  it('sanitizes trailing commas and invalid control characters', () => {
    const raw = '{"items": ["Shield", "Potion",],}';
    const result = extractJson(raw);
    expect(result.items).toEqual(['Shield', 'Potion']);
  });

  it('throws an error on completely empty or invalid non-JSON strings', () => {
    expect(() => extractJson('')).toThrow();
    expect(() => extractJson('This has no json at all.')).toThrow();
  });
});
