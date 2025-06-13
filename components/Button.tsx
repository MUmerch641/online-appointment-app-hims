import React from "react";
import { Button } from "react-native-paper";

const CustomButton = ({ title, onPress, loading }:any) => {
  return (
    <Button  mode="contained" onPress={onPress} loading={loading} style={{ marginVertical: 10}}>
      {title}
    </Button>
  );
};

export default CustomButton;
