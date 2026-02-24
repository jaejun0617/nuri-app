// 파일: src/app/ui/AppText.styles.ts
import styled from 'styled-components/native';

export const StyledText = styled.Text<{
  $color?: string;
  $align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}>`
  color: ${({ theme, $color }) => $color ?? theme.colors.textPrimary};
  text-align: ${({ $align }) => $align ?? 'auto'};
`;
