import { EntityTriple, GraphNode, GraphEdge, EntityType } from '../types';

export class StoryGraphState {
  private nodesMap: Map<string, GraphNode> = new Map();
  private edgesMap: Map<string, GraphEdge> = new Map();
  private listeners: Set<() => void> = new Set();
  private lastProcessedSegmentIndex: number = -1;

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  private sanitizeId(name: string): string {
    return name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  private inferEntityType(name: string, explicitType?: EntityType): EntityType {
    if (explicitType) return explicitType;
    const lower = name.toLowerCase();
    
    if (/\b(forest|castle|library|room|city|mountain|tower|village|kingdom|island|cave|ocean|hall|valley|sector|station)\b/i.test(lower)) {
      return 'location';
    }
    if (/\b(key|sword|ring|amulet|book|crown|shield|scroll|orb|artifact|map|compass|weapon)\b/i.test(lower)) {
      return 'item';
    }
    if (/\b(guards|guild|order|army|cult|council|clan|empire|rebellion|alliance|knights|house)\b/i.test(lower)) {
      return 'faction';
    }
    if (/\b(battle|siege|eclipse|storm|coronation|ritual|trial|disaster|war|festival)\b/i.test(lower)) {
      return 'event';
    }
    return 'character';
  }

  public clear() {
    this.nodesMap.clear();
    this.edgesMap.clear();
    this.lastProcessedSegmentIndex = -1;
    this.notify();
  }

  public ingestParagraphData(triples: EntityTriple[], paragraphText: string, segmentIndex: number) {
    if (triples.length === 0 && !paragraphText) return;

    // Reset new node flags on new batch
    this.nodesMap.forEach(node => {
      node.isNew = false;
    });

    const snippet = paragraphText.length > 140 ? paragraphText.slice(0, 140) + '...' : paragraphText;

    triples.forEach(triple => {
      if (!triple.source || !triple.target) return;

      const sourceId = this.sanitizeId(triple.source);
      const targetId = this.sanitizeId(triple.target);

      // Merge or Create Source Node
      let sourceNode = this.nodesMap.get(sourceId);
      if (!sourceNode) {
        sourceNode = {
          id: sourceId,
          name: triple.source.trim(),
          type: this.inferEntityType(triple.source, triple.sourceType),
          mentionCount: 0,
          occurrences: [],
          isNew: true,
        };
        this.nodesMap.set(sourceId, sourceNode);
      }
      sourceNode.mentionCount += 1;
      if (!sourceNode.occurrences.some(o => o.segmentIndex === segmentIndex)) {
        sourceNode.occurrences.push({ segmentIndex, snippet, timestamp: Date.now() });
      }

      // Merge or Create Target Node
      let targetNode = this.nodesMap.get(targetId);
      if (!targetNode) {
        targetNode = {
          id: targetId,
          name: triple.target.trim(),
          type: this.inferEntityType(triple.target, triple.targetType),
          mentionCount: 0,
          occurrences: [],
          isNew: true,
        };
        this.nodesMap.set(targetId, targetNode);
      }
      targetNode.mentionCount += 1;
      if (!targetNode.occurrences.some(o => o.segmentIndex === segmentIndex)) {
        targetNode.occurrences.push({ segmentIndex, snippet, timestamp: Date.now() });
      }

      // Merge or Create Edge
      const relFormatted = (triple.relationship || 'CONNECTED_TO').toUpperCase().replace(/\s+/g, '_');
      const edgeId = `${sourceId}__${relFormatted}__${targetId}`;
      if (!this.edgesMap.has(edgeId)) {
        this.edgesMap.set(edgeId, {
          id: edgeId,
          source: sourceId,
          target: targetId,
          relationship: relFormatted,
          segmentIndex,
        });
      }
    });

    this.lastProcessedSegmentIndex = Math.max(this.lastProcessedSegmentIndex, segmentIndex);
    this.notify();
  }

  public getNodes(): GraphNode[] {
    return Array.from(this.nodesMap.values());
  }

  public getEdges(): GraphEdge[] {
    return Array.from(this.edgesMap.values());
  }

  public getNodeById(id: string): GraphNode | undefined {
    return this.nodesMap.get(id);
  }

  public getInconsistencyAudit(): string {
    const nodes = this.getNodes();
    if (nodes.length === 0) return '';

    const issues: string[] = [];
    const edges = this.getEdges();

    // 1. Audit item possession conflicts (e.g. an artifact held by multiple people)
    const itemNodes = nodes.filter(n => n.type === 'item');
    itemNodes.forEach(item => {
      const possessorEdges = edges.filter(e => 
        e.target === item.id && 
        (e.relationship.includes('POSSESS') || e.relationship.includes('HELD') || e.relationship.includes('WIELD') || e.relationship.includes('CARRIED') || e.relationship.includes('STOLE'))
      );
      if (possessorEdges.length > 1) {
        const possessors = Array.from(new Set(possessorEdges.map(e => this.nodesMap.get(e.source)?.name || e.source)));
        issues.push(`Object/Item '${item.name}' was recently associated with multiple characters (${possessors.join(', ')}). Ensure clarity on who currently holds it.`);
      }
    });

    // 2. Audit character status flags (e.g. captive, injured, deceased, missing)
    const characterNodes = nodes.filter(n => n.type === 'character');
    characterNodes.forEach(char => {
      const statusEdges = edges.filter(e => 
        (e.source === char.id || e.target === char.id) && 
        (e.relationship.includes('KILL') || e.relationship.includes('DIE') || e.relationship.includes('DEAD') || 
         e.relationship.includes('CAPTURED') || e.relationship.includes('IMPRISON') || e.relationship.includes('INJURED') || 
         e.relationship.includes('VANISH') || e.relationship.includes('TRAPPED'))
      );
      if (statusEdges.length > 0) {
        const rels = Array.from(new Set(statusEdges.map(e => e.relationship.toLowerCase().replace(/_/g, ' ')))).join(', ');
        issues.push(`Character '${char.name}' has sensitive status events in lore (${rels}). Do NOT contradict their current status unless explicitly resolved.`);
      }
    });

    // 3. Audit relationship flips (e.g., ally vs enemy)
    characterNodes.forEach(c => {
      const cEdges = edges.filter(e => e.source === c.id || e.target === c.id);
      const isAlly = cEdges.some(e => e.relationship.includes('ALLY') || e.relationship.includes('FRIEND') || e.relationship.includes('PROTECT'));
      const isEnemy = cEdges.some(e => e.relationship.includes('ENEMY') || e.relationship.includes('ATTACK') || e.relationship.includes('BETRAY') || e.relationship.includes('FIGHT'));
      if (isAlly && isEnemy) {
        issues.push(`Character '${c.name}' has shifting allegiance (ally & opponent) in past scenes. Maintain logical character motivations.`);
      }
    });

    // 4. Default continuity check if no specific anomalies flagged
    if (issues.length === 0 && characterNodes.length > 0) {
      const charNames = characterNodes.slice(0, 4).map(c => c.name).join(', ');
      issues.push(`Maintain consistent character identities, abilities, and locations for: ${charNames}.`);
    }

    return issues.length > 0 ? issues.map(i => `- ${i}`).join('\n') : '';
  }

  public recordCharacterSentiment(characterName: string, sentiment: string, segmentIndex: number) {
    if (!characterName || !sentiment) return;
    const charId = this.sanitizeId(characterName);
    let charNode = this.nodesMap.get(charId);
    if (!charNode) {
      charNode = {
        id: charId,
        name: characterName.trim(),
        type: 'character',
        mentionCount: 1,
        occurrences: [],
        emotionalTrend: [],
        currentEmotion: sentiment,
      };
      this.nodesMap.set(charId, charNode);
    }
    
    if (!charNode.emotionalTrend) {
      charNode.emotionalTrend = [];
    }

    charNode.currentEmotion = sentiment;
    if (!charNode.emotionalTrend.some(e => e.segmentIndex === segmentIndex && e.sentiment === sentiment)) {
      charNode.emotionalTrend.push({
        segmentIndex,
        sentiment,
        timestamp: Date.now(),
      });
    }

    this.notify();
  }

  public getDominantSentiment(): string {
    const counts: Record<string, number> = {};
    this.nodesMap.forEach(node => {
      if (node.type === 'character') {
        const emotion = node.currentEmotion;
        if (emotion && emotion !== 'neutral') {
          counts[emotion] = (counts[emotion] || 0) + 2;
        }
        if (node.emotionalTrend && node.emotionalTrend.length > 0) {
          const recentTrend = node.emotionalTrend.slice(-3);
          recentTrend.forEach(t => {
            if (t.sentiment && t.sentiment !== 'neutral') {
              counts[t.sentiment] = (counts[t.sentiment] || 0) + 1;
            }
          });
        }
      }
    });

    let topSentiment = 'neutral';
    let maxCount = 0;
    Object.entries(counts).forEach(([sentiment, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topSentiment = sentiment;
      }
    });

    return topSentiment;
  }

  public getLoreContextForPrompt(): string {
    const nodes = this.getNodes();
    if (nodes.length === 0) return '';

    const characters = nodes.filter(n => n.type === 'character').map(n => n.name);
    const locations = nodes.filter(n => n.type === 'location').map(n => n.name);
    const items = nodes.filter(n => n.type === 'item').map(n => n.name);

    const edges = this.getEdges().slice(-10); // recent active relationships
    const relations = edges.map(e => {
      const src = this.nodesMap.get(e.source)?.name || e.source;
      const tgt = this.nodesMap.get(e.target)?.name || e.target;
      return `${src} ${e.relationship.toLowerCase().replace(/_/g, ' ')} ${tgt}`;
    });

    const characterEmotionalTrends = nodes
      .filter(n => n.type === 'character' && (n.currentEmotion || (n.emotionalTrend && n.emotionalTrend.length > 0)))
      .map(n => {
        const trendStr = (n.emotionalTrend || []).slice(-4).map(e => e.sentiment).join(' → ');
        return `${n.name}: current mood "${n.currentEmotion || 'neutral'}"${trendStr ? ` (Emotional Arc: ${trendStr})` : ''}`;
      });

    const parts = [];
    if (characters.length > 0) parts.push(`Key Characters: ${characters.slice(0, 6).join(', ')}`);
    if (characterEmotionalTrends.length > 0) parts.push(`Character Emotional Sentiments & Arcs: ${characterEmotionalTrends.join('; ')}`);
    if (locations.length > 0) parts.push(`Locations: ${locations.slice(0, 5).join(', ')}`);
    if (items.length > 0) parts.push(`Key Objects: ${items.slice(0, 5).join(', ')}`);
    if (relations.length > 0) parts.push(`Active Entity Connections: ${relations.join('; ')}`);

    return parts.join(' | ');
  }
}

export const globalStoryGraph = new StoryGraphState();
