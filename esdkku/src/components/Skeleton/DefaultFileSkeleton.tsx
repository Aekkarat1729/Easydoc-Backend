import React from "react";
import { Skeleton } from "antd";

type Props = {
  count?: number; 
};

const DefaultFileSkeleton = ({ count = 10 }: Props) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3 mb-3">
          <Skeleton.Avatar shape="square" size="large" />
          <div className="flex flex-col w-full gap-2">
            <Skeleton title={{ width: "100%" }} paragraph={false} />
            <Skeleton active paragraph={false} style={{ width: "25%" }} />
          </div>
        </div>
      ))}
    </>
  );
};

export default DefaultFileSkeleton;