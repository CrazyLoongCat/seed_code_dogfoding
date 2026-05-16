import json
import os
from typing import List, Dict, Any
from collections import Counter
from .models import NewsItem


CATEGORY_KEYWORDS = {
    "科技": ["科技", "技术", "AI", "人工智能", "芯片", "互联网", "手机", "电脑", "软件", "算法", "数据", "云计算", "区块链", "元宇宙", "VR", "AR", "机器人", "自动化", "5G", "新能源", "航天", "卫星", "量子", "GPT", "大模型", "OpenAI", "特斯拉", "苹果", "华为", "小米", "百度", "阿里", "腾讯", "字节"],
    "娱乐": ["娱乐", "明星", "电影", "电视剧", "综艺", "音乐", "演唱会", "演员", "歌手", "导演", "票房", "热搜", "八卦", "绯闻", "离婚", "结婚", "生子", "恋情", "时尚", "穿搭", "美妆", "游戏", "电竞", "动漫", "小说", "IP", "影视"],
    "财经": ["财经", "经济", "股市", "股票", "基金", "理财", "投资", "房价", "楼市", "房地产", "GDP", "通胀", "利率", "汇率", "人民币", "美元", "黄金", "石油", "涨价", "降价", "补贴", "政策", "银行", "保险", "证券", "上市", "融资", "并购", "破产", "裁员", "降薪", "加班"],
    "体育": ["体育", "足球", "篮球", "NBA", "CBA", "世界杯", "奥运会", "亚运会", "欧冠", "英超", "西甲", "意甲", "德甲", "中超", "梅西", "C罗", "詹姆斯", "库里", "姚明", "谷爱凌", "苏炳添", "马拉松", "健身", "减肥", "健康"],
    "政治": ["政治", "政府", "政策", "领导人", "习近平", "李克强", "美国", "中国", "俄罗斯", "乌克兰", "战争", "冲突", "外交", "制裁", "选举", "总统", "总理", "议会", "立法", "法案", "人权", "民主", "自由", "台独", "港独", "疆独", "藏独", "主权", "领土"],
    "社会": ["社会", "民生", "教育", "医疗", "养老", "就业", "失业", "创业", "工资", "收入", "贫富", "房价", "房租", "交通", "高铁", "地铁", "飞机", "火车", "事故", "灾难", "地震", "洪水", "火灾", "爆炸", "疫情", "病毒", "防疫", "隔离", "核酸", "疫苗"],
    "教育": ["教育", "学校", "大学", "高考", "考研", "留学", "学生", "老师", "教授", "校长", "教育部", "985", "211", "清北", "作业", "考试", "成绩", "毕业", "就业", "培训", "补习班", "家教", "网课"],
    "国际": ["国际", "全球", "世界", "联合国", "美国", "英国", "法国", "德国", "日本", "韩国", "印度", "巴西", "澳大利亚", "加拿大", "欧盟", "北约", "G7", "G20", "WTO", "WHO", "气候", "环境", "碳排放", "能源", "粮食", "难民", "移民"]
}


def rule_based_analysis(news_list: List[NewsItem], source1_name: str, source2_name: str) -> Dict[str, Any]:
    source1_titles = [item.title for item in news_list if source1_name in item.source]
    source2_titles = [item.title for item in news_list if source2_name in item.source]
    
    def get_topics(titles: List[str]) -> List[str]:
        topic_counter = Counter()
        for title in titles:
            for category, keywords in CATEGORY_KEYWORDS.items():
                for keyword in keywords:
                    if keyword.lower() in title.lower():
                        topic_counter[category] += 1
                        break
        return [topic for topic, count in topic_counter.most_common(5)]
    
    source1_topics = get_topics(source1_titles)
    source2_topics = get_topics(source2_titles)
    
    common_themes = list(set(source1_topics) & set(source2_topics))
    
    if not common_themes:
        common_themes = list(set(source1_topics[:3] + source2_topics[:3]))[:3]
    
    if source1_topics and source2_topics:
        s1_main = source1_topics[0] if source1_topics else "综合"
        s2_main = source2_topics[0] if source2_topics else "综合"
        if s1_main == s2_main:
            comparison = f"两个网站都主要关注{s1_main}领域热点"
        else:
            comparison = f"{source1_name}更关注{s1_main}，{source2_name}更关注{s2_main}"
    else:
        comparison = "两个网站的热点内容各有侧重"
    
    return {
        "common_themes": common_themes,
        "comparison": comparison,
        "source1_topics": source1_topics,
        "source2_topics": source2_topics,
        "analysis_mode": "rule_based"
    }


async def simulate_ai_analysis(news_list: List[NewsItem], source1_name: str, source2_name: str) -> Dict[str, Any]:
    import random
    import time
    
    await asyncio.sleep(0.5)
    
    result = rule_based_analysis(news_list, source1_name, source2_name)
    result["analysis_mode"] = "simulated_ai"
    
    all_themes = result["source1_topics"] + result["source2_topics"] + result["common_themes"]
    random.shuffle(all_themes)
    result["common_themes"] = list(dict.fromkeys(all_themes))[:5]
    
    s1_count = len([item for item in news_list if source1_name in item.source])
    s2_count = len([item for item in news_list if source2_name in item.source])
    merged_count = len([item for item in news_list if "," in item.source])
    
    if merged_count > 0:
        result["comparison"] += f"，双方共同关注的热点有{merged_count}条"
    
    return result


async def real_ai_analysis(news_list: List[NewsItem], source1_name: str, source2_name: str, api_key: str) -> Dict[str, Any]:
    try:
        from openai import OpenAI
        
        client = OpenAI(api_key=api_key)
        
        titles_text = "\n".join([f"- [{item.source}] {item.title} (热度: {item.original_hot})" for item in news_list[:30]])
        
        system_prompt = """你是一个专业的新闻热点分析师。请分析以下两个新闻网站的热点标题列表，找出共同主题，并生成对比总结。

请严格以JSON格式返回，格式如下：
{
    "common_themes": ["主题1", "主题2", "主题3"],
    "comparison": "一句总结性对比",
    "source1_topics": ["来源1主要话题1", "来源1主要话题2"],
    "source2_topics": ["来源2主要话题1", "来源2主要话题2"]
}

注意：
1. common_themes 是两个网站共同关注的主题
2. comparison 是一句简洁的对比总结，例如"A网站更关注科技，B网站更关注娱乐"
3. source1_topics 和 source2_topics 分别是两个网站各自的主要话题
4. 主题名称要简洁，每个不超过5个字
"""
        
        user_prompt = f"""来源1名称: {source1_name}
来源2名称: {source2_name}

热点标题列表:
{titles_text}

请分析并返回JSON结果。"""
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            max_tokens=500
        )
        
        content = response.choices[0].message.content
        result = json.loads(content)
        result["analysis_mode"] = "openai_gpt"
        
        return result
    
    except Exception as e:
        print(f"AI调用失败，使用规则分析: {e}")
        result = rule_based_analysis(news_list, source1_name, source2_name)
        result["error"] = str(e)
        result["analysis_mode"] = "rule_based_fallback"
        return result


async def analyze_news(news_list: List[NewsItem], source1_name: str, source2_name: str, use_simulate: bool = True, api_key: str = None) -> Dict[str, Any]:
    if use_simulate:
        return await simulate_ai_analysis(news_list, source1_name, source2_name)
    elif api_key:
        return await real_ai_analysis(news_list, source1_name, source2_name, api_key)
    else:
        return rule_based_analysis(news_list, source1_name, source2_name)


import asyncio
