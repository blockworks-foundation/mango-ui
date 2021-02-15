import React, { useState } from "react";
import { Input } from "antd";

export const NumericInput = React.forwardRef((props: any, ref: any) => {
  // The value of the number in input box
  const [value, setValue] = useState<Number>();
  // When the value changes
  // Functions should implement this to make sure only number inputs are given
  const onChange = (e: any) => {
    const { value } = e.target;
    const reg = /^-?\d*(\.\d*)?$/;
    if (reg.test(value) || value === "" || value === "-") {
      setValue(value);
    }
  };

  // // '.' at the end or only '-' in the input box.
  // const onBlur = () => {
  //   const { value, onBlur, onChange } = props;
  //   let valueTemp = value;
  //   if (value.charAt(value.length - 1) === "." || value === "-") {
  //     valueTemp = value.slice(0, -1);
  //   }
  //   if (value.startsWith(".") || value.startsWith("-.")) {
  //     valueTemp = valueTemp.replace(".", "0.");
  //   }
  //   onChange(valueTemp.replace(/0*(\d+)/, "$1"));
  //   if (onBlur) {
  //     onBlur();
  //   }
  // };
  return (
    <Input
      {...props}
      value={value}
      ref={ref}
      onChange={onChange}
      maxLength={25}
    />
  );
});
