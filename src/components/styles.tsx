import styled from 'styled-components';

// Styled components
export const EditorContainer = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
`;

export const LeftPanel = styled.div`
  width: 40%;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #ccc;
`;

export const RightPanel = styled.div`
  width: 60%;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

export const InputSection = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
`;

export const EditorWrapper = styled.div`
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: white;
  font-family: monospace;
  padding: 10px;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  
  .DraftEditor-root {
    flex: 1;
  overflow-y: auto;
  }
  
  .public-DraftStyleDefault-ul {
    margin-left: 20px;
  }
  
  .public-DraftStyleDefault-ol {
    margin-left: 20px;
  }
  
  .public-DraftStyleDefault-header {
    font-weight: bold;
  }
`;

export const ToolbarContainer = styled.div<{ isOpen: boolean }>`
  display: flex;
  flex-wrap: wrap;
  padding: 5px 0;
  margin-bottom: 5px;
  border-bottom: 1px solid #ddd;
  max-height: ${props => props.isOpen ? '200px' : '40px'};
  overflow: hidden;
  transition: max-height 0.3s ease-in-out;
`;

export const ToolbarButton = styled.button<{ active?: boolean }>`
  padding: 5px 10px;
  margin-right: 5px;
  margin-bottom: 5px;
  background-color: ${props => props.active ? '#e6f7ff' : 'white'};
  border: 1px solid #d9d9d9;
  border-radius: 2px;
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    background-color: ${props => props.active ? '#e6f7ff' : '#f5f5f5'};
  }
  
  &:focus {
    outline: none;
  }
`;

export const ToggleToolbarButton = styled.button`
  padding: 5px 10px;
  margin-right: 5px;
  margin-bottom: 5px;
  background-color: #f0f0f0;
  border: 1px solid #d9d9d9;
  border-radius: 2px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  
  &:hover {
    background-color: #e6e6e6;
  }
  
  &:focus {
    outline: none;
  }
`;

export const GraphContainer = styled.div`
  flex: 1;
  height: 100%;
  padding: 20px;
  display: flex;
  flex-direction: column;
  
  & > div {
    flex: 1;
  }
`;