type CCUSummaryField = {
  titleKey: string;
  fallback: string;
  dataKey: string;
};

type CCUSummaryProps = {
  fields: readonly CCUSummaryField[];
  data: Record<string, string | number | undefined>;
};

/**
 * CCU 팝업은 다른 지표와 달리 상단에 PCU/CCU를 한 눈에 보여주는 전용 그리드를 사용한다.
 * 메인 팝업 컨테이너에서는 단순히 데이터를 전달하고, 마크업·접근성 책임은 이 컴포넌트가 맡는다.
 * 동일한 패턴을 별도 파일로 분리해 두면 추후 CCU 전용 UI를 수정하거나 확장할 때 영향 범위를
 * 쉽게 좁힐 수 있다.
 */
export function CCUSummary({ fields, data }: CCUSummaryProps) {
  return (
    <div
      className="summary_wrap"
      id="summaryWrap"
      style={{ gridTemplateColumns: `repeat(${fields.length || 1}, 1fr)` }}
    >
      {fields.map((item) => (
        <div className="summary_content" key={item.dataKey}>
          <div data-t={item.titleKey}>{item.fallback}</div>
          <div className="content_value" data-bitype={item.dataKey}>
            {data[item.dataKey] ?? "-"}
          </div>
        </div>
      ))}
    </div>
  );
}
