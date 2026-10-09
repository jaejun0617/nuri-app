// The artwork already contains the logo and copy. Extra height stays white.
import { View } from 'react-native';
import styled from 'styled-components/native';

export const Background = styled(View)<{ $backgroundColor: string }>`
  flex: 1;
  justify-content: flex-end;
  align-items: center;
  background-color: ${({ $backgroundColor }) => $backgroundColor};
`;
