"use client";
import React, { useState } from "react";
import Papa from "papaparse";
import { saveAs } from "file-saver";

interface DataRecord {
  매출일자: string;
  주문일시: string;
  주문번호: string;
  브랜드: string;
  프로모코드: string;
  상품번호: string;
  상품명: string;
  수량: number;
  배송국가: string;
  "거래액(원화": number;
  카테고리: string;
}

const CSVUploader: React.FC = () => {
  const [data, setData] = useState<Array<DataRecord> | null>(null);
  const [brandData, setBrandData] = useState<Record<string, string>>({});
  const [topN, setTopN] = useState<number>(5);
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("");

  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    type: "main" | "new"
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      readCSVFile(file, "UTF-8")
        .then((results) => {
          processCSVResults(results, type);
        })
        .catch(() => {
          // UTF-8 인코딩이 실패하면 EUC-KR 인코딩 시도
          readCSVFile(file, "EUC-KR").then((results) => {
            processCSVResults(results, type);
          });
        });
    }
  };

  const readCSVFile = (file: File, encoding: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      // @ts-ignore
      Papa.parse(file, {
        header: true, // 두 파일 모두 헤더가 있음
        skipEmptyLines: true,
        encoding,
        quotes: false, // 인용부호 관련 오류 무시
        skipInvalidLines: true, // 유효하지 않은 줄 건너뛰기
        quoteChar: '"', // 인용부호 문자 설정
        escapeChar: '"', // 이스케이프 문자 설정
        complete: (results) => {
          if (results.errors.length) {
            reject(results.errors);
          } else {
            resolve(results.data);
          }
        },
      });
    });
  };

  const processCSVResults = (results: any, type: "main" | "new") => {
    if (type === "main") {
      // 두 번째 행 삭제
      const filteredData = results.filter(
        (_: any, index: number) => index !== 1
      );

      const mappedData = filteredData.map((row: any) => {
        return {
          매출일자: row["매출일자"],
          주문일시: row["주문일시"],
          주문번호: row["주문번호"]
            .toString()
            .replace("=", "")
            .replace('"', "")
            .replace('"', ""),
          브랜드: row["브랜드"],
          프로모코드: row["프로모코드"],
          상품번호: row["상품번호"].toString(),
          상품명: row["상품명"],
          수량: row["수량"],
          배송국가: row["배송국가"],
          "거래액(원화": parseFloat(row["거래액(원화"] || row["거래액(원화)"]),
          카테고리: brandData[row["상품번호"].toString()] || "", // 브랜드 데이터가 있으면 사용
        };
      });
      setData(mappedData);

      // 배송국가 목록 추출
      const countryList = Array.from(
        new Set(mappedData.map((row) => row.배송국가))
      );
      setCountries(countryList);
      setSelectedCountry(countryList[0] || ""); // 첫 번째 국가를 기본 선택
    } else if (type === "new") {
      const newCSVData = results.reduce(
        (acc: Record<string, string>, row: any) => {
          acc[row["상품번호"].toString()] = row["카테고리"]; // 첫 번째 열은 상품번호, 네 번째 열은 브랜드
          return acc;
        },
        {}
      );
      setBrandData(newCSVData);

      // 기존 데이터가 있으면 브랜드 데이터를 업데이트
      if (data) {
        const updatedData = data.map((row) => {
          return {
            ...row,
            카테고리: newCSVData[row["상품번호"]] || row["카테고리"],
          };
        });
        setData(updatedData);
      }
    }
  };

  const downloadCSV = () => {
    if (data) {
      const csv = Papa.unparse(data);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "exported_data.csv");
    }
  };

  const downloadCountryTopNCSV = () => {
    if (data && selectedCountry) {
      const countryData = data.filter(
        (row) =>
          row["배송국가"] === selectedCountry || selectedCountry === "all"
      );
      const aggregatedData = countryData.reduce(
        (acc: Record<string, { totalAmount: number; count: number }>, row) => {
          if (acc[row["상품번호"]]) {
            acc[row["상품번호"]].totalAmount += row["거래액(원화"];
            acc[row["상품번호"]].count += 1;
          } else {
            acc[row["상품번호"]] = {
              totalAmount: row["거래액(원화"],
              count: 1,
            };
          }
          return acc;
        },
        {}
      );

      const topNData = Object.entries(aggregatedData)
        .sort((a, b) => b[1].totalAmount - a[1].totalAmount)
        .slice(0, topN)
        .map(([상품번호, { totalAmount, count }]) => {
          const row = data.find((item) => item["상품번호"] === 상품번호);
          return {
            상품번호: row?.상품번호,
            상품명: row?.상품명,
            브랜드: row?.브랜드,
            카테고리: row?.카테고리,
            "거래액(원화": totalAmount,
            수량: count,
          };
        });

      const csv = Papa.unparse(topNData);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, `${selectedCountry}_topN_data.csv`);
    }
  };

  return (
    <div>
      <div className='mb-4 flex items-center space-x-2'>
        <input
          type='file'
          accept='.csv'
          onChange={(e) => handleFileUpload(e, "main")}
          className='mb-2'
        />
        <input
          type='file'
          accept='.csv'
          onChange={(e) => handleFileUpload(e, "new")}
        />
        <button
          onClick={downloadCSV}
          className='px-4 py-2 bg-blue-500 text-white rounded'
        >
          Download CSV
        </button>
        <div>
          <label htmlFor='topNInput' className='mr-2'>
            Top N 개수:
          </label>
          <input
            type='number'
            id='topNInput'
            value={topN}
            onChange={(e) => setTopN(Number(e.target.value))}
            className='px-2 py-1 border rounded text-black'
          />
        </div>
        <div>
          <label htmlFor='countrySelect' className='mr-2'>
            국가 선택:
          </label>
          <select
            id='countrySelect'
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className='px-2 py-1 border rounded text-black'
          >
            <option value={"all"}>ALL</option>
            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={downloadCountryTopNCSV}
          className='px-4 py-2 bg-green-500 text-white rounded'
        >
          국가 통계
        </button>
      </div>
      {data && (
        <>
          <table className='min-w-full divide-y divide-gray-200'>
            <thead className='bg-gray-50'>
              <tr>
                {Object.keys(data[0]).map((key) => (
                  <th
                    key={key}
                    className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                  >
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className='bg-white divide-y divide-gray-200'>
              {data.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {Object.values(row).map((value, colIndex) => (
                    <td
                      key={colIndex}
                      className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};

export default CSVUploader;
