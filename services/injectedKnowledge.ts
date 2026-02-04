
import { NotebookSource } from '../types';

/**
 * MASTER SYSTEM KNOWLEDGE REPOSITORY
 * These stories are hardcoded to bypass localStorage limits and ensure stability.
 */
export const INJECTED_STORIES: NotebookSource[] = [
  {
    id: 'sys_hok_001',
    name: 'Heart of a Kingdom: The Tournament',
    content: `Sir Cedric, a young and ambitious knight, prepares for the grand tournament with his squire Jack. He faces Sir Thomas in a fierce jousting match. Both are knocked off their horses, but fight valiantly. The herald announces more contests as knights vie for glory. Cedric feels a strange resonance with the ground of the arena, a pulse he hasn't felt since his training in the Whispering Woods.`,
    size: 1500,
    type: 'text/markdown'
  },
  {
    id: 'sys_dif_001',
    name: 'Death Is Fuel: 1508 France',
    content: `In 1508 France, Jason Dexter and his father Abraham live a peaceful life after losing Jason's mother. On Jason's 15th birthday, Abraham is killed by a shadow that leaves no footprints. James Hose tells Jason about the 'Garden of Cure' in the deep forest, where his father searched for healing but always forgot the path. Jason realizes his blood has a strange property—it glows near the forest's edge.`,
    size: 1800,
    type: 'text/plain'
  },
  {
    id: 'sys_kom_001',
    name: 'The Killer of Mary: Sheltered',
    content: `Henry, Wessel, and daughter Mary live in a cottage where it always rains. Henry protects Mary from the 'creatures' outside that mimic the sound of loved ones. Henry meets his sister Yelena and discusses the similarity between Mary and a child named Mariana from the ancient scrolls. Lucifer emerges from a rift in the rain, claiming Mary is the brave child he has been seeking.`,
    size: 2100,
    type: 'text/markdown'
  },
  {
    id: 'sys_ag_001',
    name: 'Arcane Genesis: Ravenswood',
    content: `Arin lives an ordinary life in Ravenswood but dreams of adventure. He hears travelers talk about a Sorceress who escaped the king's prison in Eldrid using a spell that "signifies" reality into new shapes. Arin finds an old compass that doesn't point North, but toward the nearest source of concentrated magic. The compass leads him to a hidden library beneath the village tavern.`,
    size: 1400,
    type: 'text/plain'
  }
];
