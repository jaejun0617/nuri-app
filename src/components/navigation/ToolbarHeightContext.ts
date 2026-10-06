import { createContext } from 'react';

// Only floating content that opts in consumes this measurement; tab geometry is unchanged.
export const ToolbarHeightContext = createContext<number | null>(null);
