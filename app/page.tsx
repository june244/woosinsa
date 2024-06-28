import React from "react";
import CSVUploader from "./components/CSVUploader";

const Home: React.FC = () => {
  return (
    <div className='mx-auto p-4'>
      <h1 className='text-2xl font-bold mb-4'>
        CSV 파일 업로드 및 데이터 표시
      </h1>
      <CSVUploader />
    </div>
  );
};

export default Home;
