# Agent Note

用量字典以 provider/model 为键，条目同时保留 provider 和 modelId。请求的 header/context 更新整条路由，缺失渠道不能沿用上一请求的渠道。客户端优先匹配完整价格键，没有渠道专属价格时回退到同名模型的裸价格。流图左列按 provider 聚合渠道 Token，中列按 modelId 聚合模型 Token，右列保留 provider/model 的费用路由；连线按路由 Token 分配到两侧节点，各列独立缩放。

价格表统一使用每百万 Token 单价；bucketCost 在累加四类用量乘积后除以 1,000,000，峰谷分支共享此函数。持久化数据保留原始 Token 数量，禁止对用量记录或用户单价再做一次单位换算。

费用弹窗固定在视口水平中央，宽高受视口约束，避免放大图表后从费用按钮旁溢出屏幕。桑基图连线使用闭合填充路径，以列索引和路由索引组合作为 React key；每个 provider/model 路由最多有两段连线。

费用胶囊通过 portal 挂载到宿主的 `[data-composer-stats]` 容器，以便和内置 Token 用量胶囊共享同一行的 flex 布局。费用详情弹窗沿用宿主 Token 用量弹窗的菜单表面与双列详情结构。流图使用随 client bundle 打包的 d3-sankey 0.12.3，并保留渠道 Token→模型 Token→开销的三列关系；渠道和模型列分别按渠道 Token、模型 Token 缩放，费用列按已知费用缩放；零费用不占面积，未知价格不参与费用比例。宿主没有该容器时保留原插槽内容作为降级渲染；不要把这个选择器替换成依赖具体 DOM 层级的路径。
