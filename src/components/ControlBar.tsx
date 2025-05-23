import React from 'react';
import styled from 'styled-components';
import { EditorState } from 'draft-js';

interface ControlBarProps {
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onShareProject: () => void;
  editorState: EditorState;
  onToggleInlineStyle: (style: string) => void;
  onToggleBlockType: (blockType: string) => void;
  hasInlineStyle: (style: string) => boolean;
  hasBlockType: (blockType: string) => boolean;
}

const ControlBarContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  border-bottom: 1px solid #ddd;
  margin-bottom: 8px;
`;

const TopRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const LeftControls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ExpandButton = styled.button`
  padding: 6px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #666;
  border-radius: 4px;
  font-size: 14px;
  
  &:hover {
    background: #f0f0f0;
    color: #333;
  }
`;

const ShareButton = styled.button`
  padding: 6px 12px;
  background: #4285f4;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: #3367d6;
  }
`;

const FormattingGrid = styled.div<{ isVisible: boolean }>`
  display: ${props => props.isVisible ? 'grid' : 'none'};
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  justify-items: start;
`;

const FormatButton = styled.button<{ active?: boolean }>`
  width: 32px;
  height: 32px;
  border: none;
  background: ${props => props.active ? '#e6e6e6' : 'transparent'};
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #333;
  
  &:hover {
    background: ${props => props.active ? '#d9d9d9' : '#f0f0f0'};
  }
`;

const ControlBar: React.FC<ControlBarProps> = ({
  isExpanded,
  onToggleExpanded,
  onShareProject,
  editorState,
  onToggleInlineStyle,
  onToggleBlockType,
  hasInlineStyle,
  hasBlockType,
}) => {
  return (
    <ControlBarContainer>
      <TopRow>
        <LeftControls>
          <ExpandButton onClick={onToggleExpanded}>
            {isExpanded ? '▲' : '▼'} Formatting
          </ExpandButton>
        </LeftControls>
        <ShareButton onClick={onShareProject}>
          📤 Share
        </ShareButton>
      </TopRow>
      
      <FormattingGrid isVisible={isExpanded}>
        {/* First row - Inline styles */}
        <FormatButton 
          onClick={() => onToggleInlineStyle('BOLD')}
          active={hasInlineStyle('BOLD')}
          title="Bold"
        >
          <strong>B</strong>
        </FormatButton>
        <FormatButton 
          onClick={() => onToggleInlineStyle('ITALIC')}
          active={hasInlineStyle('ITALIC')}
          title="Italic"
        >
          <em>I</em>
        </FormatButton>
        <FormatButton 
          onClick={() => onToggleInlineStyle('UNDERLINE')}
          active={hasInlineStyle('UNDERLINE')}
          title="Underline"
        >
          <u>U</u>
        </FormatButton>
        <FormatButton 
          onClick={() => onToggleInlineStyle('STRIKETHROUGH')}
          active={hasInlineStyle('STRIKETHROUGH')}
          title="Strikethrough"
        >
          <s>S</s>
        </FormatButton>
        <FormatButton 
          onClick={() => onToggleBlockType('code-block')}
          active={hasBlockType('code-block')}
          title="Code Block"
        >
          &lt;/&gt;
        </FormatButton>
        
        {/* Second row - Block types */}
        <FormatButton 
          onClick={() => onToggleBlockType('header-one')}
          active={hasBlockType('header-one')}
          title="Header 1"
        >
          H1
        </FormatButton>
        <FormatButton 
          onClick={() => onToggleBlockType('header-two')}
          active={hasBlockType('header-two')}
          title="Header 2"
        >
          H2
        </FormatButton>
        <FormatButton 
          onClick={() => onToggleBlockType('unordered-list-item')}
          active={hasBlockType('unordered-list-item')}
          title="Bullet List"
        >
          •
        </FormatButton>
        <FormatButton 
          onClick={() => onToggleBlockType('ordered-list-item')}
          active={hasBlockType('ordered-list-item')}
          title="Numbered List"
        >
          1.
        </FormatButton>
        <FormatButton 
          onClick={() => onToggleBlockType('blockquote')}
          active={hasBlockType('blockquote')}
          title="Quote"
        >
          "
        </FormatButton>
      </FormattingGrid>
    </ControlBarContainer>
  );
};

export default ControlBar;