import { AtlasSubmission, AtlasTeaser, MyComposition } from "./Composition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <MyComposition />
      <AtlasTeaser />
      <AtlasSubmission />
    </>
  );
};
