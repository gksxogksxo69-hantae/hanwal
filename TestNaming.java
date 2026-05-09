import org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy;
import org.hibernate.boot.model.naming.Identifier;

public class TestNaming {
    public static void main(String[] args) {
        CamelCaseToUnderscoresNamingStrategy strategy = new CamelCaseToUnderscoresNamingStrategy();
        Identifier id = strategy.toPhysicalColumnName(Identifier.toIdentifier("spiritCostA"), null);
        System.out.println(id.getText());
    }
}
