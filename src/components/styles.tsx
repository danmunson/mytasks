import styled from 'styled-components';

// // Styled components
// export const EditorContainer = styled.div`
//   display: flex;
//   height: 100%;
//   width: 100%;
// `;

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
  position: relative;
  height: 100%;
  padding: 16px;
  padding-top: 32px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
`;

export const EditorWrapper = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
`;


// export const GraphContainer = styled.div`
//   flex: 1;
//   height: 100%;
//   padding: 20px;
//   display: flex;
//   flex-direction: column;
  
//   & > div {
//     flex: 1;
//   }
// `;

export const EditorContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
`;

export const GraphContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
`;

export const FloatingEditorPanel = styled.div`
  position: absolute;
  top: 20px;
  left: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  
  .handle {
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  &:hover .handle {
    opacity: 1;
  }
`;

export const CloseButton = styled.button`
  position: absolute;
  top: 8px;
  left: 8px;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  border-radius: 50%;
  
  &:hover {
    background: #f0f0f0;
    color: #333;
  }
`;

export const FloatingEditButton = styled.button`
  position: absolute;
  top: 20px;
  left: 20px;
  padding: 8px 16px;
  background: white;
  border: none;
  border-radius: 4px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  z-index: 1000;
  
  &:hover {
    background: #f5f5f5;
  }
`; 

