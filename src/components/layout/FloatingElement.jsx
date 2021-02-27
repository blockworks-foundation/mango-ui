import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div`
  margin: 5px;
  padding: 20px;
  background-color: #141026;
  border: 1px solid #584f81;
`;

export default function FloatingElement({ style = undefined, children, stretchVertical = false }) {
  return (
    <Wrapper
      style={{
        height: stretchVertical ? 'calc(100% - 10px)' : undefined,
        borderRadius: 10,
        ...style,
      }}
    >
      {children}
    </Wrapper>
  );
}
