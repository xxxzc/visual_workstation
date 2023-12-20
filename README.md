### 数据结构

data.json 组成

```json
{
    "city": "上海", "zone": "杨高南路", "floor": "12层",
    "width": 100, "height": 100,
    "objects": [], "templates": []
}
```

为了统一表示，width 对应 x 轴长度，height 对应 y 轴长度，depth 对应 z 轴高度，这个是参照 BoxGeometry 的定义来。

#### Template

template 为 Object 的模板，定义这一个楼层使用一些模板物体。

```json
{
    // 模板名称
    "template": "NormalSeat",
    "type": "Seat",
    "name": "正常工位",
    // 占据的长宽高
    "width": 2, "height": 1, "depth": 1,
    // 当使用平面显示时，显示的物体颜色和文字
    "color": "#aabbcc",
    "text": "正常工位",
    // 当使用3D显示时，使用的模型文件
    "model": ""
}
```

#### Object3D

Object3D 是 three.js 实际交互的物体对象，包含 Mesh、Group 等类型

#### Object

Object 为 Template 的扩展实例，用于生成实际展示的 Object3D 对象，数据会保存到 Object3D 的 meta 字段里：

```json
{
    "id": "100", // 物体的唯一标志
    "template": "NormalSeat", // 使用的模板
    "name": "正常工位", // 物体名称
    // 实际占据的长宽高
    "width": 2, "height": 1, "depth": 1,
    // 所在位置（左下角）
    "x": 8, "y": 31, "z": 1,
    // 当使用平面显示时，显示的物体颜色和文字
    "color": "#aabbcc",
    "text": "A-111",
    // 当使用3D显示时，使用的模型文件
    "model": ""
}
```

不存在的字段会从 Template 里取。