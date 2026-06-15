$ErrorActionPreference = "Stop"

function New-Example {
  param(
    [string]$Word,
    [string]$Chinese,
    [string]$Vietnamese
  )

  [ordered]@{
    chinese = $Chinese
    pinyin = ""
    vietnamese = $Vietnamese
    word = $Word
  }
}

function Add-Pairs {
  param(
    [hashtable]$Data,
    [string]$Key,
    [string]$Word,
    [array]$Pairs
  )

  foreach ($pair in $Pairs) {
    $Data[$Key] += New-Example -Word $Word -Chinese $pair[0] -Vietnamese $pair[1]
  }
}

function Add-VerbPhrase {
  param(
    [hashtable]$Data,
    [string]$Key,
    [string]$Word,
    [string]$Phrase,
    [string]$Meaning
  )

  Add-Pairs $Data $Key $Word @(
    @("我想$Phrase。", "Tôi muốn $Meaning."),
    @("他正在$Phrase。", "Anh ấy đang $Meaning."),
    @("明天我们一起$Phrase。", "Ngày mai chúng ta cùng $Meaning."),
    @("你喜欢${Phrase}吗？", "Bạn có thích $Meaning không?"),
    @("我周末常常$Phrase。", "Cuối tuần tôi thường $Meaning."),
    @("她已经${Phrase}了。", "Cô ấy đã $Meaning rồi."),
    @("如果有时间，我就$Phrase。", "Nếu có thời gian, tôi sẽ $Meaning."),
    @("他不太会$Phrase。", "Anh ấy không biết $Meaning lắm."),
    @("${Phrase}的时候，要认真。", "Khi $Meaning thì phải nghiêm túc."),
    @("今天我没有$Phrase。", "Hôm nay tôi không $Meaning.")
  )
}

function Add-Noun {
  param(
    [hashtable]$Data,
    [string]$Key,
    [string]$Word,
    [string]$Meaning,
    [string]$Measure = "个"
  )

  Add-Pairs $Data $Key $Word @(
    @("我买了一个$Word。", "Tôi đã mua một $Meaning."),
    @("这个${Word}很有用。", "$Meaning này rất hữu ích."),
    @("他的${Word}在桌子上。", "$Meaning của anh ấy ở trên bàn."),
    @("这里有很多$Word。", "Ở đây có rất nhiều $Meaning."),
    @("请把${Word}给我。", "Làm ơn đưa $Meaning cho tôi."),
    @("那个${Word}是新的。", "$Meaning kia là đồ mới."),
    @("我正在找我的$Word。", "Tôi đang tìm $Meaning của tôi."),
    @("这个${Word}不太贵。", "$Meaning này không đắt lắm."),
    @("你需要${Word}吗？", "Bạn có cần $Meaning không?"),
    @("我把${Word}放在包里。", "Tôi để $Meaning vào trong túi.")
  )
}

function Add-PlaceOrAbstract {
  param(
    [hashtable]$Data,
    [string]$Key,
    [string]$Word,
    [string]$Meaning
  )

  Add-Pairs $Data $Key $Word @(
    @("我对$Word 很感兴趣。", "Tôi rất hứng thú với $Meaning."),
    @("$Word 对我很重要。", "$Meaning rất quan trọng với tôi."),
    @("老师今天讲了$Word。", "Hôm nay giáo viên đã giảng về $Meaning."),
    @("这个$Word 不太难。", "$Meaning này không khó lắm."),
    @("我们正在学习$Word。", "Chúng tôi đang học $Meaning."),
    @("他很了解$Word。", "Anh ấy rất hiểu về $Meaning."),
    @("你喜欢${Word}吗？", "Bạn có thích $Meaning không?"),
    @("关于$Word，我有一个问题。", "Về $Meaning, tôi có một câu hỏi."),
    @("$Word 的内容很多。", "Nội dung của $Meaning rất nhiều."),
    @("我想提高自己的$Word。", "Tôi muốn nâng cao $Meaning của mình.")
  )
}

function Add-Adjective {
  param(
    [hashtable]$Data,
    [string]$Key,
    [string]$Word,
    [string]$Meaning
  )

  Add-Pairs $Data $Key $Word @(
    @("这个人很$Word。", "Người này rất $Meaning."),
    @("他说话挺$Word 的。", "Anh ấy nói chuyện khá $Meaning."),
    @("我觉得她很$Word。", "Tôi thấy cô ấy rất $Meaning."),
    @("$Word 的人很受欢迎。", "Người $Meaning rất được yêu thích."),
    @("你今天看起来很$Word。", "Hôm nay trông bạn rất $Meaning."),
    @("这件事让我觉得很$Word。", "Việc này khiến tôi thấy rất $Meaning."),
    @("他比以前更$Word 了。", "Anh ấy $Meaning hơn trước rồi."),
    @("这个回答很$Word。", "Câu trả lời này rất $Meaning."),
    @("大家都觉得他很$Word。", "Mọi người đều thấy anh ấy rất $Meaning."),
    @("她的样子有点儿$Word。", "Dáng vẻ của cô ấy hơi $Meaning.")
  )
}

$data = @{
  "3" = @()
  "5" = @()
}

Add-Pairs $data "3" "除了以外" @(
  @("除了汉语以外，我还会英语。", "Ngoài tiếng Trung ra, tôi còn biết tiếng Anh."),
  @("除了我以外，大家都来了。", "Ngoài tôi ra, mọi người đều đã đến."),
  @("除了学习以外，他也喜欢运动。", "Ngoài học tập ra, anh ấy cũng thích vận động."),
  @("除了咖啡以外，她还喜欢喝茶。", "Ngoài cà phê ra, cô ấy còn thích uống trà."),
  @("除了中国以外，他还去过日本。", "Ngoài Trung Quốc ra, anh ấy còn từng đi Nhật Bản."),
  @("除了星期天以外，我每天都上课。", "Ngoài Chủ nhật ra, ngày nào tôi cũng đi học."),
  @("除了这本书以外，我还买了一本词典。", "Ngoài cuốn sách này ra, tôi còn mua một cuốn từ điển."),
  @("除了米饭以外，我还点了一个菜。", "Ngoài cơm ra, tôi còn gọi một món ăn."),
  @("除了老师以外，学生也可以参加。", "Ngoài giáo viên ra, học sinh cũng có thể tham gia."),
  @("除了坐地铁以外，我们还可以坐公共汽车。", "Ngoài đi tàu điện ngầm ra, chúng ta còn có thể đi xe buýt.")
)
Add-VerbPhrase $data "3" "打" "打电话" "gọi điện thoại"
Add-VerbPhrase $data "3" "网球" "打网球" "chơi tennis"
Add-Pairs $data "3" "一就" @(
  @("我一到家就给你打电话。", "Tôi vừa về đến nhà là gọi điện cho bạn ngay."),
  @("他一听这个消息就笑了。", "Anh ấy vừa nghe tin này là cười ngay."),
  @("我一有时间就去运动。", "Tôi cứ có thời gian là đi vận động."),
  @("她一看见老师就站起来。", "Cô ấy vừa nhìn thấy giáo viên là đứng dậy."),
  @("孩子一放学就回家。", "Đứa trẻ vừa tan học là về nhà."),
  @("我一喝咖啡就睡不着。", "Tôi cứ uống cà phê là không ngủ được."),
  @("他一紧张就说错话。", "Anh ấy cứ căng thẳng là nói sai."),
  @("雨一停，我们就出发。", "Mưa vừa tạnh là chúng tôi xuất phát."),
  @("我一毕业就想工作。", "Tôi vừa tốt nghiệp là muốn đi làm."),
  @("她一到北京就来看我。", "Cô ấy vừa đến Bắc Kinh là đến thăm tôi.")
)
Add-Adjective $data "3" "寂寞" "cô đơn"
Add-VerbPhrase $data "3" "毕业" "毕业" "tốt nghiệp"
Add-Pairs $data "3" "后来" @(
  @("我以前不喜欢运动，后来喜欢上了网球。", "Trước đây tôi không thích vận động, sau đó lại thích tennis."),
  @("他先学英语，后来又学汉语。", "Anh ấy học tiếng Anh trước, sau đó lại học tiếng Trung."),
  @("后来我们成了好朋友。", "Sau này chúng tôi trở thành bạn tốt."),
  @("我开始不懂，后来明白了。", "Ban đầu tôi không hiểu, sau đó đã hiểu."),
  @("她后来去了北京工作。", "Sau đó cô ấy đến Bắc Kinh làm việc."),
  @("后来天气变好了。", "Sau đó thời tiết đã tốt lên."),
  @("他后来没有参加比赛。", "Sau đó anh ấy không tham gia cuộc thi."),
  @("后来我给老师发了邮件。", "Sau đó tôi gửi email cho giáo viên."),
  @("我们后来在学校见面了。", "Sau đó chúng tôi gặp nhau ở trường."),
  @("这件事后来解决了。", "Việc này sau đó đã được giải quyết.")
)
Add-Noun $data "3" "高中" "trường cấp ba"
Add-PlaceOrAbstract $data "3" "专业" "chuyên ngành"
Add-VerbPhrase $data "3" "想家" "想家" "nhớ nhà"
Add-VerbPhrase $data "3" "出差" "出差" "đi công tác"
Add-Pairs $data "3" "另外" @(
  @("我买了书，另外还买了一支笔。", "Tôi mua sách, ngoài ra còn mua một cây bút."),
  @("今天有听力课，另外还有口语课。", "Hôm nay có tiết nghe, ngoài ra còn có tiết nói."),
  @("他会英语，另外也会一点儿汉语。", "Anh ấy biết tiếng Anh, ngoài ra cũng biết một chút tiếng Trung."),
  @("这家店很便宜，另外服务也不错。", "Cửa hàng này rất rẻ, ngoài ra phục vụ cũng không tệ."),
  @("我想喝茶，另外再要一杯水。", "Tôi muốn uống trà, ngoài ra lấy thêm một cốc nước."),
  @("我们明天开会，另外还要写报告。", "Ngày mai chúng tôi họp, ngoài ra còn phải viết báo cáo."),
  @("他买了机票，另外还订了酒店。", "Anh ấy mua vé máy bay, ngoài ra còn đặt khách sạn."),
  @("这件衣服好看，另外也不贵。", "Bộ quần áo này đẹp, ngoài ra cũng không đắt."),
  @("请带护照，另外别忘了学生卡。", "Hãy mang hộ chiếu, ngoài ra đừng quên thẻ sinh viên."),
  @("我喜欢旅游，另外也喜欢照相。", "Tôi thích du lịch, ngoài ra cũng thích chụp ảnh.")
)
Add-Pairs $data "3" "却" @(
  @("天气很冷，他却穿得很少。", "Trời rất lạnh, vậy mà anh ấy mặc rất ít."),
  @("我想帮他，他却不愿意。", "Tôi muốn giúp anh ấy, nhưng anh ấy lại không muốn."),
  @("这道题不难，我却做错了。", "Câu này không khó, vậy mà tôi lại làm sai."),
  @("她很忙，却每天坚持学习。", "Cô ấy rất bận nhưng ngày nào cũng kiên trì học."),
  @("他说会来，却没有来。", "Anh ấy nói sẽ đến nhưng lại không đến."),
  @("我已经提醒他了，他却忘了。", "Tôi đã nhắc anh ấy rồi, vậy mà anh ấy lại quên."),
  @("这本书很厚，却很有意思。", "Cuốn sách này rất dày nhưng rất thú vị."),
  @("他很年轻，却很有经验。", "Anh ấy rất trẻ nhưng rất có kinh nghiệm."),
  @("我想休息，却还有很多作业。", "Tôi muốn nghỉ ngơi nhưng vẫn còn nhiều bài tập."),
  @("她看起来安静，却很幽默。", "Cô ấy trông yên tĩnh nhưng rất hài hước.")
)
Add-Noun $data "3" "女朋友" "bạn gái"
Add-Adjective $data "3" "幽默" "hài hước"
Add-VerbPhrase $data "3" "照相" "照相" "chụp ảnh"
Add-Pairs $data "3" "趟" @(
  @("我去了一趟超市。", "Tôi đã đi siêu thị một chuyến."),
  @("他明天要去一趟北京。", "Ngày mai anh ấy phải đi Bắc Kinh một chuyến."),
  @("你能帮我跑一趟吗？", "Bạn có thể đi giúp tôi một chuyến không?"),
  @("我上午去了一趟医院。", "Buổi sáng tôi đã đi bệnh viện một chuyến."),
  @("她想回家一趟。", "Cô ấy muốn về nhà một chuyến."),
  @("这趟车很快。", "Chuyến xe này rất nhanh."),
  @("我上个月去了一趟上海。", "Tháng trước tôi đã đi Thượng Hải một chuyến."),
  @("老师让他去办公室一趟。", "Giáo viên bảo anh ấy đến văn phòng một chuyến."),
  @("这趟旅行很有意思。", "Chuyến du lịch này rất thú vị."),
  @("我得去银行一趟。", "Tôi phải đi ngân hàng một chuyến.")
)
Add-VerbPhrase $data "3" "陪" "陪妈妈" "ở cùng mẹ"
Add-PlaceOrAbstract $data "3" "贸易" "thương mại"
Add-VerbPhrase $data "3" "翻译" "翻译句子" "dịch câu"
Add-Pairs $data "3" "挺的" @(
  @("这件衣服挺好看的。", "Bộ quần áo này khá đẹp."),
  @("他这个人挺幽默的。", "Con người anh ấy khá hài hước."),
  @("今天的天气挺好的。", "Thời tiết hôm nay khá tốt."),
  @("这家饭馆挺便宜的。", "Nhà hàng này khá rẻ."),
  @("这道题挺难的。", "Câu này khá khó."),
  @("她说汉语说得挺好的。", "Cô ấy nói tiếng Trung khá tốt."),
  @("这个办法挺有用的。", "Cách này khá hữu ích."),
  @("这次旅行挺有意思的。", "Chuyến du lịch lần này khá thú vị."),
  @("他的房间挺干净的。", "Phòng của anh ấy khá sạch."),
  @("这个城市挺安全的。", "Thành phố này khá an toàn.")
)
Add-Noun $data "3" "太太" "vợ; phu nhân"
Add-VerbPhrase $data "3" "担心" "担心孩子" "lo cho con"
Add-Adjective $data "3" "安全" "an toàn"
Add-Noun $data "3" "同事" "đồng nghiệp"
Add-Pairs $data "3" "不过" @(
  @("这件衣服很好看，不过有点儿贵。", "Bộ quần áo này rất đẹp, nhưng hơi đắt."),
  @("我想去，不过今天没有时间。", "Tôi muốn đi, nhưng hôm nay không có thời gian."),
  @("他很忙，不过还是来帮我了。", "Anh ấy rất bận, nhưng vẫn đến giúp tôi."),
  @("这个菜很好吃，不过有点儿辣。", "Món này rất ngon, nhưng hơi cay."),
  @("天气不太好，不过我们还想出去。", "Thời tiết không tốt lắm, nhưng chúng tôi vẫn muốn ra ngoài."),
  @("我会说一点儿汉语，不过说得不好。", "Tôi biết nói một chút tiếng Trung, nhưng nói chưa tốt."),
  @("这本书很厚，不过很有意思。", "Cuốn sách này rất dày, nhưng rất thú vị."),
  @("他答应了，不过还没有来。", "Anh ấy đã đồng ý, nhưng vẫn chưa đến."),
  @("这个房子不大，不过很干净。", "Căn nhà này không lớn, nhưng rất sạch."),
  @("我喜欢咖啡，不过晚上不喝。", "Tôi thích cà phê, nhưng buổi tối không uống.")
)
Add-Adjective $data "3" "惊讶" "ngạc nhiên"

Add-Noun $data "5" "耳机" "tai nghe"
Add-VerbPhrase $data "5" "放假" "放假" "nghỉ lễ"
Add-VerbPhrase $data "5" "旅游" "去旅游" "đi du lịch"
Add-PlaceOrAbstract $data "5" "听力" "kỹ năng nghe"
Add-Adjective $data "5" "高级" "cao cấp"
Add-Adjective $data "5" "中级" "trung cấp"
Add-Pairs $data "5" "放" @(
  @("请把书放在桌子上。", "Hãy đặt sách lên bàn."),
  @("他把手机放在包里。", "Anh ấy để điện thoại vào túi."),
  @("别把水放在电脑旁边。", "Đừng để nước bên cạnh máy tính."),
  @("我把钥匙放在家里了。", "Tôi để chìa khóa ở nhà rồi."),
  @("你把饭卡放在哪儿了？", "Bạn để thẻ ăn ở đâu rồi?"),
  @("她把衣服放进箱子里。", "Cô ấy đặt quần áo vào trong vali."),
  @("请把耳机放回去。", "Hãy để tai nghe lại chỗ cũ."),
  @("我把照片放在桌面上。", "Tôi để ảnh ở trên màn hình."),
  @("不要把书包放在这里。", "Đừng để cặp sách ở đây."),
  @("他把菜单放在我面前。", "Anh ấy đặt thực đơn trước mặt tôi.")
)
Add-VerbPhrase $data "5" "摘" "摘苹果" "hái táo"
Add-Pairs $data "5" "首" @(
  @("我喜欢这首歌。", "Tôi thích bài hát này."),
  @("老师教了我们一首中文歌。", "Giáo viên dạy chúng tôi một bài hát tiếng Trung."),
  @("这首歌很好听。", "Bài hát này rất hay."),
  @("他会唱好几首歌。", "Anh ấy biết hát mấy bài hát."),
  @("请你再唱一首。", "Bạn hát thêm một bài nữa đi."),
  @("这首诗很有意思。", "Bài thơ này rất thú vị."),
  @("我听过这首歌。", "Tôi từng nghe bài hát này."),
  @("她每天听一首中文歌。", "Mỗi ngày cô ấy nghe một bài hát tiếng Trung."),
  @("这首歌是谁唱的？", "Bài hát này là ai hát vậy?"),
  @("我们一起学这首歌吧。", "Chúng ta cùng học bài hát này nhé.")
)
Add-Adjective $data "5" "好听" "hay, dễ nghe"
Add-Pairs $data "5" "按" @(
  @("请按这个按钮。", "Hãy bấm nút này."),
  @("他按了一下门铃。", "Anh ấy bấm chuông cửa một cái."),
  @("你先按这里。", "Bạn bấm vào đây trước."),
  @("我不知道该按哪个键。", "Tôi không biết nên bấm phím nào."),
  @("请按顺序排队。", "Hãy xếp hàng theo thứ tự."),
  @("他按老师说的做了。", "Anh ấy làm theo lời giáo viên nói."),
  @("按规定，不能在这里停车。", "Theo quy định, không được đỗ xe ở đây."),
  @("你按一下开关就可以了。", "Bạn bấm công tắc một cái là được."),
  @("请按时到教室。", "Hãy đến lớp đúng giờ."),
  @("我按地图找到了饭馆。", "Tôi tìm thấy nhà hàng theo bản đồ.")
)
Add-Noun $data "5" "自助餐" "buffet"
Add-Noun $data "5" "中餐" "đồ ăn Trung Quốc"
Add-Noun $data "5" "西餐" "đồ ăn Tây"
Add-Noun $data "5" "炒饭" "cơm rang"
Add-Noun $data "5" "饭卡" "thẻ ăn"
Add-VerbPhrase $data "5" "充" "充饭卡" "nạp tiền vào thẻ ăn"
Add-Pairs $data "5" "好几" @(
  @("我等了好几分钟。", "Tôi đã đợi mấy phút."),
  @("他买了好几本书。", "Anh ấy mua mấy cuốn sách."),
  @("我们去了好几个地方。", "Chúng tôi đã đi mấy nơi."),
  @("她会唱好几首歌。", "Cô ấy biết hát mấy bài hát."),
  @("我打了好几次电话。", "Tôi đã gọi mấy cuộc điện thoại."),
  @("桌子上有好几个苹果。", "Trên bàn có mấy quả táo."),
  @("他学了好几年汉语。", "Anh ấy học tiếng Trung mấy năm rồi."),
  @("我排了好久的队。", "Tôi đã xếp hàng rất lâu."),
  @("她有好几张照片。", "Cô ấy có mấy tấm ảnh."),
  @("今天来了好几位客人。", "Hôm nay có mấy vị khách đến.")
)
Add-Noun $data "5" "座位" "chỗ ngồi"
Add-VerbPhrase $data "5" "排队" "排队" "xếp hàng"
Add-PlaceOrAbstract $data "5" "速度" "tốc độ"
Add-VerbPhrase $data "5" "挑" "挑衣服" "chọn quần áo"
Add-VerbPhrase $data "5" "刷卡" "刷卡" "quẹt thẻ"
Add-Noun $data "5" "叉子" "nĩa"
Add-Noun $data "5" "筷子" "đũa"

$json = $data | ConvertTo-Json -Depth 6
Set-Content -Path "$PSScriptRoot\..\data\listening-example-tests.json" -Value $json -Encoding UTF8

$result = Get-Content "$PSScriptRoot\..\data\listening-example-tests.json" -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Output "3=$($result.'3'.Count)"
Write-Output "5=$($result.'5'.Count)"
