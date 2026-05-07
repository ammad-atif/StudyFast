import React, { createContext, useContext, useState } from "react";

type HomeFilterContextType = {
  selectedSubject?: string;
  selectedTags: string[];
  setSelectedSubject: (subject: string | undefined) => void;
  setSelectedTags: (tags: string[]) => void;
};

const HomeFilterContext = createContext<HomeFilterContextType | undefined>(undefined);

export const HomeFilterProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  return (
    <HomeFilterContext.Provider
      value={{
        selectedSubject,
        selectedTags,
        setSelectedSubject,
        setSelectedTags,
      }}
    >
      {children}
    </HomeFilterContext.Provider>
  );
};

export const useHomeFilter = () => {
  const context = useContext(HomeFilterContext);
  if (!context) {
    throw new Error("useHomeFilter must be used within HomeFilterProvider");
  }
  return context;
};
