import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
html,body{
  background: #141026;
}
input[type=number]::-webkit-inner-spin-button {
  opacity: 0;
}
input[type=number]:hover::-webkit-inner-spin-button,
input[type=number]:focus::-webkit-inner-spin-button {
  opacity: 0.25;
}
/* width */
::-webkit-scrollbar {
  width: 15px;
}
/* Track */
::-webkit-scrollbar-track {
  background: #2d313c;
}
/* Handle */
::-webkit-scrollbar-thumb {
  background: #5b5f67;
}
/* Handle on hover */
::-webkit-scrollbar-thumb:hover {
  background: #5b5f67;
}
.ant-slider-track, .ant-slider:hover .ant-slider-track {
  background-color: #f2c94c;
  opacity: 0.75;
}
.ant-slider-track,
.ant-slider ant-slider-track:hover {
  background-color: #f2c94c;
  opacity: 0.75;
}
.ant-slider-dot-active,
.ant-slider-handle,
.ant-slider-handle-click-focused,
.ant-slider:hover .ant-slider-handle:not(.ant-tooltip-open)  {
  border: 2px solid #f2c94c;
  background-color: #f2c94c; 
}
.ant-table-tbody > tr.ant-table-row:hover > td {
  background: #3a3745;
}
.ant-table-tbody > tr > td {
  border-bottom: 8px solid #141026;
}
.ant-table-container table > thead > tr:first-child th {
  border-bottom: none;
}
.ant-divider-horizontal.ant-divider-with-text::before, .ant-divider-horizontal.ant-divider-with-text::after {
  border-top: 1px solid #434a59 !important;
}
.ant-layout {
    background: #141026
  }
  .ant-table {
    background: #262337;
  }
  .ant-table-thead > tr > th {
    background: #141026;
  }
.ant-select-item-option-content {
  img {
    margin-right: 4px;
  }
}
.ant-table-thead th.ant-table-column-has-sorters:hover {
  background: #3a3745;
}
.ant-modal-content {
  background-color: #262337;
}

@-webkit-keyframes highlight {
  from { background-color: #f2c94c;}
  to {background-color: #141026;}
}
@-moz-keyframes highlight {
  from { background-color: #f2c94c;}
  to {background-color: #141026;}
}
@-keyframes highlight {
  from { background-color: #f2c94c;}
  to {background-color: #141026;}
}
.flash {
  -moz-animation: highlight 0.5s ease 0s 1 alternate ;
  -webkit-animation: highlight 0.5s ease 0s 1 alternate;
  animation: highlight 0.5s ease 0s 1 alternate;
}`;
