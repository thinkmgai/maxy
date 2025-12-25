type DashWidgetProps = {
  wrapperClassName: string;
  widgetIds: string[];
};

export default function DashWidget({ wrapperClassName, widgetIds }: DashWidgetProps) {
  const html = widgetIds.map((id) => `<div id="${id}" class="maxy_box"></div>`).join("");

  return <div className={wrapperClassName} dangerouslySetInnerHTML={{ __html: html }} />;
}
